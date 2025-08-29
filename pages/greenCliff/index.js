// pages/greenCliff/index.js

// 统一的图片、音频、视频URL处理函数
const tempUrlCache = {}; // 缓存对象
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 缓存有效期24小时

async function getTemporaryImageUrl(imageUrl, type) {
  if (!imageUrl) {
    console.warn(`${type || 'Resource'} URL is empty`);
    return '';
  }

  // 如果是HTTP/HTTPS链接，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 检查缓存
  if (tempUrlCache[imageUrl] && (Date.now() - tempUrlCache[imageUrl].timestamp < CACHE_EXPIRATION_TIME)) {
    return tempUrlCache[imageUrl].url;
  }

  try {
    let finalImageUrl = imageUrl;

    // 如果是相对路径，拼接云存储前缀
    if (!imageUrl.startsWith('cloud://')) {
      finalImageUrl = `cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1345335463/${imageUrl}`;
    }

    // 如果是云存储链接，转换为临时链接
    if (finalImageUrl.startsWith('cloud://')) {
      // 创建跨环境调用的Cloud实例
      const c = new wx.cloud.Cloud({ 
        identityless: true, 
        resourceAppid: 'wx85d92d28575a70f4', 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      });
      await c.init();
      
      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('图片URL转换超时')), 5000)
      );
      
      const result = await Promise.race([
        c.getTempFileURL({ fileList: [finalImageUrl] }),
        timeoutPromise
      ]);
      
      if (result.fileList && result.fileList.length > 0 && result.fileList[0].tempFileURL) {
        const tempUrl = result.fileList[0].tempFileURL;
        // 存入缓存
        tempUrlCache[imageUrl] = { url: tempUrl, timestamp: Date.now() };
        return tempUrl;
      } else {
        console.error(`Failed to get temp URL for ${type}:`, result);
        return imageUrl; // 返回原URL作为fallback
      }
    }
    
  } catch (error) {
    console.error(`Error processing ${type} URL:`, error);
    return imageUrl; // 返回原URL作为fallback
  }
  return imageUrl; // 默认返回原始URL
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    showScrolls: true,
    selectedType: '',

    showChapterMenu: false,
    showAreaMenu: false,
    filteredChapter: null, // 修改为null，表示显示所有章节
    filteredArea: null, // 同样修改为null，保持一致性
    selectedSeasonArea: '', // 当前选中的博物馆区域
    timeMuseumAreas: [], // 新增：晓时博物馆展区列表
    loading: true, // 新增：加载状态
    loadingText: '正在初始化...', // 新增：加载文本
    unlockedChapters: [], // 云端解锁的章节列表
    unlockedAreas: [], // 云端解锁的区域列表
    solarTerms: [
      { name: '立春', phenology: ['东风解冻', '蛰虫始振', '鱼陟负冰'] },
      { name: '雨水', phenology: ['獭祭鱼', '鸿雁来', '草木萌动'] },
      { name: '惊蛰', phenology: ['桃始华', '仓庚鸣', '鹰化为鸠'] },
      { name: '春分', phenology: ['玄鸟至', '雷乃发声', '始电'] },
      { name: '清明', phenology: ['桐始华', '田鼠化为鴽', '虹始见'] },
      { name: '谷雨', phenology: ['萍始生', '鸣鸠拂其羽', '戴胜降于桑'] },
      { name: '立夏', phenology: ['蝼蝈鸣', '蚯蚓出', '王瓜生'] },
      { name: '小满', phenology: ['苦菜秀', '靡草死', '麦秋至'] },
      { name: '芒种', phenology: ['螳螂生', '鵙始鸣', '反舌无声'] },
      { name: '夏至', phenology: ['鹿角解', '蜩始鸣', '半夏生'] },
      { name: '小暑', phenology: ['温风至', '蟋蟀居宇', '鹰始挚'] },
      { name: '大暑', phenology: ['腐草为萤', '土润溽暑', '大雨时行'] },
      { name: '立秋', phenology: ['凉风至', '白露降', '寒蝉鸣'] },
      { name: '处暑', phenology: ['鷹乃祭鳥', '天地始肃', '禾乃登'] },
      { name: '白露', phenology: ['鸿雁来宾', '玄鸟归', '群鸟养羞'] },
      { name: '秋分', phenology: ['雷始收声', '蛰虫坯户', '水始涸'] },
      { name: '寒露', phenology: ['鸿雁来宾', '雀入大水为蛤', '菊有黄华'] },
      { name: '霜降', phenology: ['豺乃祭兽', '草木黄落', '蜇虫咸俯'] },
      { name: '立冬', phenology: ['水始冰', '地始冻', '雉入大水为蜃'] },
      { name: '小雪', phenology: ['虹藏不见', '天气上升地气下降', '闭塞而成冬'] },
      { name: '大雪', phenology: ['鹖旦不鸣', '虎始交', '荔挺出'] },
      { name: '冬至', phenology: ['蚯蚓结', '麋角解', '水泽腹坚'] },
      { name: '小寒', phenology: ['雁北乡', '鹊始巢', '雉始雊'] },
      { name: '大寒', phenology: ['鸡始乳', '征鸟厉疾', '水泽腹坚'] }
    ],
    cityMuseum: {
      chapters: []  // 将从数据库获取
    },
    seasonMuseum: {
      areas: []
    },
    // 城市博物馆章节
    cityMuseumChapters: [
      // ... existing code ...
    ],
    
    // 诗画古城数据
    cityPoetry: [], // 将从数据库获取
    currentPoetryIndex: 0,
    showSeasonAreaMenu: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    try {
      // 设置超时时间为10秒
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('加载超时')), 10000)
      );
      
      // 更新加载文本
      this.setData({
        loadingText: '正在加载基础数据...'
      });
      
      // 并行获取诗画古城数据和博物馆章节数据
      const dataPromises = [
        this.fetchCityPoetry(),
        this.fetchMuseumChapters(),
        this.loadUserInfo()
      ];
      
      // 等待并行任务完成或超时
      await Promise.race([
        Promise.all(dataPromises),
        timeout
      ]);
      
      // 更新加载文本
      this.setData({
        loadingText: '正在加载展区信息...'
      });
      
      // 获取晓时博物馆数据
      await Promise.race([
        this.getTimeMuseumAreas(),
        timeout
      ]);
      
      // 所有数据加载完成，隐藏loading
      this.setData({
        loading: false
      });
      
    } catch (error) {
      console.error('页面数据加载失败:', error);
      
      // 显示错误提示
      if (error.message === '加载超时') {
        wx.showToast({
          title: '加载超时，请检查网络',
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '数据加载失败',
          icon: 'none',
          duration: 2000
        });
      }
      
      // 即使出错也要隐藏loading
      this.setData({
        loading: false
      });
    }
  },

  /**
   * 加载用户信息（通过云函数获取最新数据）
   */
  async loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    
    if (userInfo && userInfo.openid) {
      // 用户已登录，获取最新信息
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      try {
        await cloud.init()
        // 云环境初始化完成后继续执行
        const res = await cloud.callFunction({
          name: 'xsj_auth',
          data: {
            action: 'getUserInfo'
          }
        });
        
        if (res.result.success) {
          const userData = res.result.data;
          // 更新本地存储
          wx.setStorageSync('userInfo', userData);
          

          
          // 获取解锁信息
          try {
            const unlockRes = await cloud.callFunction({
              name: 'unlocked_chapters',
              data: {
                openid: userData.openid,
                action: 'getUnlockedItems'
              }
            });
            
            if (unlockRes.result.success) {
              const unlockData = unlockRes.result.data;
              // 将解锁信息存储到页面数据中，不再使用本地存储
              this.setData({
                unlockedChapters: unlockData.unlockedChapters || [],
                unlockedAreas: unlockData.unlockedAreas || []
              });
            }
          } catch (unlockErr) {
            console.error('获取解锁信息失败:', unlockErr);
          }
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
      }
    }
  },

  // 获取诗画古城数据
  async fetchCityPoetry() {
    try {
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
          action: 'getCityPoetry',
          data: {
            page: 1,
            pageSize: 50  // 获取更多诗词以供轮播
          }
        }
      });

      if (result.success) {
        // 处理诗句，添加换行
        const poetry = result.data.list;
        poetry.forEach((item, index) => {
          if (item.verse.includes('，')) {
            poetry[index].verse = item.verse.replace('，', '，\n');
          } else if (item.verse.includes('。')) {
            poetry[index].verse = item.verse.replace('。', '。\n');
          }
        });

        this.setData({
          cityPoetry: poetry,
          // 随机初始化诗词索引，让每次打开页面显示不同的诗
          currentPoetryIndex: Math.floor(Math.random() * poetry.length)
        });
      } else {
        console.error('获取诗画古城数据失败：', result.error);
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('调用云函数失败：', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },

  // 处理诗句，添加换行
  processPoetry() {
    const poetry = this.data.cityPoetry;
    poetry.forEach((item, index) => {
      if (item.verse.includes('，')) {
        poetry[index].verse = item.verse.replace('，', '，\n');
      } else if (item.verse.includes('。')) {
        poetry[index].verse = item.verse.replace('。', '。\n');
      }
    });
    this.setData({
      cityPoetry: poetry
    });
  },

  // 获取博物馆章节数据
  async fetchMuseumChapters() {
    try {
      console.log('开始获取博物馆章节数据');
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
          action: 'getChapters',
          type: 'city'
        }
      });

      console.log('获取到的博物馆章节数据:', result);

      if (result.success) {
        // 并行处理章节封面图片URL
        const imagePromises = result.data.map(chapter => 
          getTemporaryImageUrl(chapter.cover_image, 'chapter_cover')
        );
        
        const processedImages = await Promise.all(imagePromises);
        
        const processedChapters = result.data.map((chapter, index) => ({
          ...chapter,
          cover_image: processedImages[index]
        }));
        
        this.setData({
          'cityMuseum.chapters': processedChapters
        });
        console.log('设置后的cityMuseum.chapters:', this.data.cityMuseum.chapters);
      } else {
        console.error('获取博物馆章节失败：', result.error);
      }
    } catch (error) {
      console.error('调用云函数失败：', error);
    }
  },

  // 选择画轴
  onSelectScroll(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      showScrolls: false,
      selectedType: type
    });
  },

  // 返回画轴选择
  onBack() {
    this.setData({
      showScrolls: true,
      selectedType: '',
      showChapterMenu: false,
      showAreaMenu: false,
      filteredChapter: null,
      filteredArea: null
    });
  },

  // 切换章节菜单
  toggleChapterMenu() {
    console.log('切换章节菜单，当前状态:', !this.data.showChapterMenu);
    this.setData({
      showChapterMenu: !this.data.showChapterMenu
    });
  },

  // 切换区域菜单
  toggleAreaMenu() {
    this.setData({
      showAreaMenu: !this.data.showAreaMenu,
      showChapterMenu: false
    });
  },

  // 选择章节
  selectChapter(e) {
    const chapter = e.currentTarget.dataset.chapter;
    console.log('选择章节:', chapter);
    this.setData({
      filteredChapter: chapter || null, // 如果chapter为空字符串，则设置为null
      showChapterMenu: false
    });
    console.log('设置后的filteredChapter:', this.data.filteredChapter);
  },

  // 选择区域
  selectArea(e) {
    const area = e.currentTarget.dataset.area;
    this.setData({
      selectedSeasonArea: area,
      showAreaMenu: false
    });
  },

  // 打开城市章节
  openCityChapter(e) {
    const chapterId = e.currentTarget.dataset.chapter;
    const chapter = this.data.cityMuseum.chapters.find(c => c.chapter_id === chapterId);
    
    if (!chapter) {
      wx.showToast({
        title: '章节不存在',
        icon: 'none'
      });
      return;
    }

    // 直接导航到章节内容，无需解锁
    wx.navigateTo({
      url: `/pages/articleDetail/index?type=city&chapter=${chapter.chapter_id}`
    });
  },

  /**
   * 打开时节博物馆区域
   */
  openSeasonArea(e) {
    const area = e.currentTarget.dataset.area;
    
    // 找到对应的展区数据
    const areaData = this.data.timeMuseumAreas.find(item => item.area_id === area);
    if (!areaData) {
      wx.showToast({
        title: '展区不存在',
        icon: 'none'
      });
      return;
    }
    
    // 直接导航到区域内容，无需解锁
    wx.navigateTo({
      url: `/pages/articleDetail/index?type=area&area=${areaData.area_id}`
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时，通过云函数重新获取最新的用户数据
    this.loadUserInfo();
    // 检查用户会员状态
    this.checkUserMemberStatus();
  },

  // 检查用户会员状态
  async checkUserMemberStatus() {
    try {
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef',
      });
      await cloud.init();

      const res = await cloud.callFunction({
        name: 'xsj_pay',
        data: {
          action: 'checkMemberStatus'
        }
      });

      const now = new Date().getTime();
      const hasShownExpiredModal = wx.getStorageSync('hasShownExpiredModal');

      if (res.result && res.result.memberExpireTime < now && !hasShownExpiredModal) {
        wx.setStorageSync('hasShownExpiredModal', true);
        wx.showModal({
          title: '会员过期提醒',
          content: '您的会员已过期，部分功能可能受限，请考虑续费。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    } catch (error) {
      console.error('检查会员状态失败:', error);
    }
  },



  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 选择某个节气，显示详情
   */
  selectSolarTerm(e) {
    const index = e.currentTarget.dataset.index;
    this.showSolarTermDetail(index);
  },

  /**
   * 显示节气详情
   */
  showSolarTermDetail(index) {
    const term = this.data.solarTerms[index];
    let content = term.phenology.join('\n');
    
    wx.showModal({
      title: term.name,
      content: content,
      showCancel: false,
      confirmText: '关闭'
    });
  },

  /**
   * 打开季节介绍页面
   */
  openSeasonIntro(e) {
    const season = e.currentTarget.dataset.season;
    let seasonName = '';
    
    switch(season) {
      case 'all':
        seasonName = '二十四节气概览';
        break;
      case 'spring':
        seasonName = '春季节气';
        break;
      case 'summer':
        seasonName = '夏季节气';
        break;
      case 'autumn':
        seasonName = '秋季节气';
        break;
      case 'winter':
        seasonName = '冬季节气';
        break;
      default:
        seasonName = '节气介绍';
    }
    
    wx.navigateTo({
      url: `/pages/articleDetail/index?type=season&season=${season}`
    });
  },

  // 诗画古城轮播图改变事件
  onPoetrySwiperChange: function(e) {
    const current = e.detail.current;
    this.setData({
      currentPoetryIndex: current
    });
  },
  
  // 显示诗词详情
  showPoetryDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    const poetry = this.data.cityPoetry[index];
    wx.showModal({
      title: poetry.title,
      content: `${poetry.verse}\n\n${poetry.poet} · ${poetry.city}`,
      showCancel: false,
      confirmText: '关闭'
    });
  },
  
  onFilterChapterTap: function(e) {
    // ... existing code ...
  },

  /**
   * 切换节气区域选择菜单显示状态
   */
  toggleSeasonAreaMenu() {
    this.setData({
      showSeasonAreaMenu: !this.data.showSeasonAreaMenu
    });
  },

  /**
   * 选择要显示的节气区域
   */
  selectSeasonArea(e) {
    const area = e.currentTarget.dataset.area;
    console.log('选择区域:', area);
    this.setData({
      filteredArea: area || null, // 如果area为空字符串，则设置为null
      showSeasonAreaMenu: false
    });
    console.log('设置后的filteredArea:', this.data.filteredArea);
  },

  // 获取晓时博物馆展区列表
  async getTimeMuseumAreas() {
    try {
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
          action: 'getTimeMuseumAreas'
        }
      });

      if (result.success) {
        // 并行处理展区数据，包括封面图片URL转换
        const imagePromises = result.data.map(area => 
          getTemporaryImageUrl(area.cover_image, 'area_cover')
        );
        
        const processedImages = await Promise.all(imagePromises);
        
        const processedAreas = result.data.map((area, index) => ({
          ...area,
          cover_image: processedImages[index]
        }));
        
        this.setData({
          timeMuseumAreas: processedAreas,
          'seasonMuseum.areas': processedAreas.map(area => ({
            id: area.area_id,
            name: area.name
          }))
        });
      } else {
        console.error('获取展区列表失败:', result.error);
        wx.showToast({
          title: '获取展区列表失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取展区列表失败:', error);
      wx.showToast({
        title: '获取展区列表失败',
        icon: 'none'
      });
    }
  },

  // 点击展区
  onAreaTap(e) {
    const area = e.currentTarget.dataset.area;

    // 跳转到展区详情页
    wx.navigateTo({
      url: `/pages/articleDetail/index?type=time&area=${area.area_id}`
    })
  }
})