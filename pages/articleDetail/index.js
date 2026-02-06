Page({
  data: {
    chapter: '',
    type: '',
    title: '',
    images: [],
    loading: true,
    area: '',
    term: '',
    season: '',
    apiBaseUrl: 'https://api.timemuseum.domain',  // 配置API基础URL
    uploadConfig: {
      imageUrl: '/upload/image',
      maxImageSize: 5, // MB
      supportedImageFormats: ['jpg', 'jpeg', 'png']
    },
    isVIP: false,
    showMembershipModal: false
  },

  onShow: function() {
    this.checkUserMemberStatus();
  },

  onLoad: function(options) {
    const { type, chapter, area, term, season, title } = options;
    
    console.log('articleDetail onLoad options:', options); // 添加日志
    
    if (!type || (type === 'city' && !chapter) || (type === 'season' && !season)) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      type,
      chapter: chapter || '',
      area: area || '',
      term: term || '',
      season: season || '',
      title: title || '',
      loading: true
    });

    // 加载图片和相关内容
    this.loadContent(type, chapter, area, term, season);
    
    // 检查会员状态
    this.checkUserMemberStatus();
  },

  // 检查用户会员状态
  checkUserMemberStatus: function() {
    // 1. 先尝试从本地缓存获取
    const userInfo = wx.getStorageSync('userInfo');
    // 如果没有用户信息，肯定不是会员
    if (!userInfo || !userInfo.openid) {
      this.setData({ isVIP: false });
      return;
    }

    // 2. 尝试从全局数据获取（如果有）
    // const app = getApp();
    // if (app.globalData.isVIP !== undefined) {
    //   this.setData({ isVIP: app.globalData.isVIP });
    // }
    
    // 3. 稳妥起见，这里简单默认 false，或者如果你确认 timeSequence 更新了本地存储的 isVIP，可以读一下
    // 目前项目似乎没有把 isVIP 存到 storage，所以还是得默认 false 或者重新请求
    // 为了体验，我们可以假设如果是会员，在之前的页面已经获取过状态并可能存到了 app.globalData 或者 storage
    // 这里的实现复用 timeSequence 的逻辑，尝试云函数，但为了不阻塞显示，先静默检查
    
    // 临时方案：复用 timeSequence 的逻辑
    // 为了性能，如果已经在 timeSequence 获取过并存了 globalData，最好用 globalData
    // 现阶段我们再调一次云函数，或者根据 storage 里的标识（如果有）
    
    // 这里实现一个简化版：
    // 如果有 'isVIP' 缓存则读取
    const cachedVIP = wx.getStorageSync('isVIP');
    if (cachedVIP === true) {
      this.setData({ isVIP: true });
    } else {
       // 调用云函数检查（静默）
       this.checkMemberStatusCloud();
    }
  },

  async checkMemberStatusCloud() {
    try {
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        identityless: true, 
        resourceAppid: 'wx85d92d28575a70f4', 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      await c.init();
      
      const res = await c.callFunction({
        name: 'xsj_pay',
        data: { action: 'checkMemberStatus' }
      });

      if (res.result && res.result.success) {
        const isVIP = res.result.isVIP;
        this.setData({ isVIP: isVIP });
        wx.setStorageSync('isVIP', isVIP); // 缓存状态
      }
    } catch (e) {
      console.error('检查会员状态失败', e);
    }
  },

  // 非会员触摸锁定区域触发
  handleLockTouch: function() {
    if (!this.data.isVIP) {
      this.setData({ showMembershipModal: true });
    }
  },

  // 显示会员弹窗
  showMemberModal: function() {
    this.setData({ showMembershipModal: true });
  },

  // 关闭会员弹窗
  closeMembershipModal: function() {
    this.setData({ showMembershipModal: false });
  },

  // 跳转会员页
  goToMembership: function() {
    this.setData({ showMembershipModal: false });
    wx.navigateTo({
      url: '/pages/membership/index'
    });
  },

  loadContent: function(type, chapter, area, term, season) {
    this.loadImages(type, chapter, area, term, season);
  },

  // 加载图片
  loadImages: async function(type, chapter, area, term, season) {
    console.log('loadImages params:', { type, chapter, area, term, season });
    
    // 设置默认占位图
    const placeholderImage = { 
      url: '../../images/placeholder-a4.svg', 
      width: 595, // A4纸宽度 (72dpi)
      height: 842, // A4纸高度 (72dpi)
      isPlaceholder: true // 标记为占位图，实际项目中会由后端上传的真实图片替换
    };

    // 先设置占位图，确保页面有内容显示
    this.setData({
      images: [placeholderImage],
      loading: true
    });

    try {
      // 调用云函数获取图片数据
      let action, queryId, collection;
      if (type === 'city') {
        action = 'getChapterDetail';
        queryId = chapter;
        collection = 'museum_chapters';
      } else if (type === 'season') {
        action = 'getSeasonDetail';
        queryId = season;
        collection = 'museum_seasons';
      } else {
        action = 'getAreaDetail';
        queryId = area;
        collection = 'museum_areas';
      }

      console.log('准备调用云函数:', { action, queryId, collection }); // 更详细的日志

      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      await c.init() 
      const res = await c.callFunction({
        name: 'museum',
        data: {
          action: action,
          data: {
            [type === 'city' ? 'chapter_id' : type === 'season' ? 'season_id' : 'area_id']: queryId,
            collection: collection
          }
        }
      });

      console.log('云函数返回结果:', res.result);

      if (res.result && res.result.success && res.result.data) {
        const data = res.result.data;
        console.log('获取到的数据:', data);
        
        if (data.images && data.images.length > 0) {
          console.log('处理图片列表:', data.images);
          
          try {
            // 获取临时文件链接 - 使用跨环境调用
            console.log('开始获取临时文件链接，fileList:', data.images); // 添加日志
            // 创建跨环境调用的Cloud实例
            var c = new wx.cloud.Cloud({ 
              // 必填，表示是未登录模式 
              identityless: true, 
              // 资源方 AppID 
              resourceAppid: 'wx85d92d28575a70f4', 
              // 资源方环境 ID 
              resourceEnv: 'cloud1-1gsyt78b92c539ef', 
            }) 
            await c.init();
            const result = await c.getTempFileURL({
              fileList: data.images
            });
            
            console.log('获取到的临时链接:', result);
            
            if (result.fileList && result.fileList.length > 0) {
              const images = result.fileList.map(file => {
                console.log('处理单个文件:', file); // 添加日志
                return {
                  url: file.tempFileURL || placeholderImage.url,
                  width: 595,
                  height: 842,
                  isPlaceholder: !file.tempFileURL
                };
              });
              
              console.log('最终处理的图片列表:', images);
              
              this.setData({
                title: data.name || '',
                images: images,
                loading: false
              });
            } else {
              console.error('获取临时文件链接失败: 返回的 fileList 为空'); // 添加详细错误信息
              throw new Error('获取临时文件链接失败: 返回的 fileList 为空');
            }
          } catch (error) {
            console.error('获取临时文件链接失败:', error);
            this.setData({
              title: data.name || '',
              images: [placeholderImage],
              loading: false
            });
            wx.showToast({
              title: '图片加载失败',
              icon: 'none'
            });
          }
        } else {
          console.log('没有找到图片数据');
          // 如果没有图片，保持占位图
          this.setData({
            title: data.name || '',
            loading: false
          });
        }
      } else {
        console.error('云函数返回错误:', res.result?.error || '获取数据失败'); // 添加详细错误信息
        throw new Error(res.result?.error || '获取数据失败');
      }
    } catch (error) {
      console.error('loadImages 整体错误:', error); // 添加错误日志
      // 调用失败，保持占位图
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 预览图片
  previewImage: function(e) {
    // 非会员拦截
    if (!this.data.isVIP) {
      this.setData({ showMembershipModal: true });
      return;
    }

    const { index } = e.currentTarget.dataset;
    const urls = this.data.images.map(img => img.url);
    
    wx.previewImage({
      current: urls[index],
      urls: urls
    });
  },
  
  // 返回上一页
  navigateBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },
  
  // 处理API错误
  handleAPIError: function() {
    // 显示错误提示
    wx.showToast({
      title: '内容加载失败，请稍后再试',
      icon: 'none'
    });
    
    // 设置占位图
    this.setData({
      images: [{ 
        url: '../../images/placeholder-a4.svg', 
        width: 595, // A4纸宽度 (72dpi)
        height: 842, // A4纸高度 (72dpi)
        isPlaceholder: true // 标记为占位图，实际项目中会由后端上传的真实图片替换
      }],
      loading: false
    });
  },

  // 获取晓时博物馆展区详情
  async getTimeAreaDetail(area) {
    console.log('开始获取展区详情，参数:', { area });
    
    try {
      wx.showLoading({
        title: '加载中...'
      });
      
      console.log('调用云函数获取展区详情，参数:', {
        action: 'getAreaDetail',
        data: { area_id: area }
      });
      
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      await c.init() 
      const { result } = await c.callFunction({
        name: 'museum',
        data: {
          action: 'getAreaDetail',
          data: {
            area_id: area
          }
        }
      });
      
      console.log('展区详情数据:', result);
      
      if (result.success) {
        const areaData = result.data;
        console.log('获取到的展区数据:', areaData);
        
        // 设置标题
        wx.setNavigationBarTitle({
          title: areaData.name
        });

        if (areaData.images && areaData.images.length > 0) {
          console.log('处理展区图片列表:', areaData.images);
          
          try {
            // 获取临时文件链接 - 使用跨环境调用
            // 创建跨环境调用的Cloud实例
            var c = new wx.cloud.Cloud({ 
              // 必填，表示是未登录模式 
              identityless: true, 
              // 资源方 AppID 
              resourceAppid: 'wx85d92d28575a70f4', 
              // 资源方环境 ID 
              resourceEnv: 'cloud1-1gsyt78b92c539ef', 
            }) 
            await c.init() 
            const tempResult = await c.getTempFileURL({
              fileList: areaData.images
            });
            
            console.log('获取到的临时链接:', tempResult);
            
            if (tempResult.fileList && tempResult.fileList.length > 0) {
              const images = tempResult.fileList.map(file => ({
                url: file.tempFileURL || '../../images/placeholder-a4.svg',
                isPlaceholder: !file.tempFileURL
              }));
              
              console.log('最终处理的展区图片列表:', images);
              
              // 设置数据
              this.setData({
                timeArea: areaData,
                images: images,
                loading: false
              });
            } else {
              throw new Error('获取展区图片临时链接失败');
            }
          } catch (error) {
            console.error('获取展区图片临时链接失败:', error);
            this.setData({
              timeArea: areaData,
              images: [{
                url: '../../images/placeholder-a4.svg',
                isPlaceholder: true
              }],
              loading: false
            });
            wx.showToast({
              title: '图片加载失败',
              icon: 'none'
            });
          }
        } else {
          console.log('展区没有图片数据');
          this.setData({
            timeArea: areaData,
            images: [{
              url: '../../images/placeholder-a4.svg',
              isPlaceholder: true
            }],
            loading: false
          });
        }
      } else {
        console.error('获取展区详情失败:', result.error);
        wx.showToast({
          title: result.error || '获取展区详情失败',
          icon: 'none'
        });
        this.setData({
          loading: false
        });
      }
    } catch (error) {
      console.error('获取展区详情失败:', error);
      wx.showToast({
        title: '获取展区详情失败',
        icon: 'none'
      });
      this.setData({
        loading: false
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 文章阅读完成
  onArticleReadComplete: async function() {
    // 记录文章阅读活动 - 使用跨环境调用
    // 创建跨环境调用的Cloud实例
    var c = new wx.cloud.Cloud({ 
      // 必填，表示是未登录模式 
      identityless: true, 
      // 资源方 AppID 
      resourceAppid: 'wx85d92d28575a70f4', 
      // 资源方环境 ID 
      resourceEnv: 'cloud1-1gsyt78b92c539ef', 
    }) 
    await c.init() 
    try {
      await c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'recordUserActivity',
          description: `阅读了《${this.data.article.title}》`,
          type: 'reading'
        }
      });
    } catch (error) {
      console.error('记录阅读活动失败:', error);
    }
  },

  // 点赞文章
  onLikeArticle: async function() {
    // 记录点赞活动 - 使用跨环境调用
    // 创建跨环境调用的Cloud实例
    var c = new wx.cloud.Cloud({ 
      // 必填，表示是未登录模式 
      identityless: true, 
      // 资源方 AppID 
      resourceAppid: 'wx85d92d28575a70f4', 
      // 资源方环境 ID 
      resourceEnv: 'cloud1-1gsyt78b92c539ef', 
    }) 
    await c.init() 
    try {
      await c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'recordUserActivity',
          description: `为《${this.data.article.title}》点赞`,
          type: 'interaction',
          reward: 1 // 点赞奖励1个树苗
        }
      });
    } catch (error) {
      console.error('记录点赞活动失败:', error);
    }
  },

  // 评论文章
  submitComment: async function(e) {
    // 记录评论活动 - 使用跨环境调用
    // 创建跨环境调用的Cloud实例
    var c = new wx.cloud.Cloud({ 
      // 必填，表示是未登录模式 
      identityless: true, 
      // 资源方 AppID 
      resourceAppid: 'wx85d92d28575a70f4', 
      // 资源方环境 ID 
      resourceEnv: 'cloud1-1gsyt78b92c539ef', 
    }) 
    await c.init() 
    try {
      await c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'recordUserActivity',
          description: `评论了《${this.data.article.title}》`,
          type: 'interaction',
          reward: 2 // 评论奖励2个树苗
        }
      });
    } catch (error) {
      console.error('记录评论活动失败:', error);
    }
  },

  // 阻止冒泡
  stopPropagation: function() {
    return;
  }
});
