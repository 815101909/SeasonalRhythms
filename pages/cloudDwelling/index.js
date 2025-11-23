// 统一的图片、音频、视频URL处理函数
async function getTemporaryImageUrl(imageUrl, type) {
  if (!imageUrl) {
    console.log(`${type}图片链接为空，使用默认图片`);
    return '../../images/placeholder-a4.svg';
  }
  
  try {
    // 如果是云存储链接，转换为临时HTTP链接
    if (imageUrl.startsWith('cloud://')) {
      
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
        await c.init();
        const result = await c.getTempFileURL({
          fileList: [imageUrl]
        });
        
        if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
          return result.fileList[0].tempFileURL;
        } else {
          console.error(`${type}图片云存储链接转换结果异常:`, result);
          return '../../images/placeholder-a4.svg';
        }
      } catch (err) {
        console.error(`${type}图片云存储链接转换失败:`, err);
        return '../../images/placeholder-a4.svg';
      }
    }
    
    // 如果是HTTP链接，直接返回
    if (imageUrl.startsWith('http')) {
      console.log(`${type}图片为HTTP链接:`, imageUrl);
      return imageUrl;
    }
    
    // 如果是相对路径，拼接云存储前缀
    console.log(`${type}为相对路径，拼接云存储前缀:`, imageUrl);
    const cloudUrl = `cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1345335463/${imageUrl}`;
    console.log(`拼接后的云存储URL:`, cloudUrl);
    return await getTemporaryImageUrl(cloudUrl, type);
  } catch (error) {
    console.error(`处理${type}图片链接出错:`, error);
    return '../../images/placeholder-a4.svg';
  }
}

// 生成随机头像背景颜色
function generateRandomAvatarBg() {
  const colors = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a8edea, #fed6e3)',
    'linear-gradient(135deg, #ff9a9e, #fecfef)',
    'linear-gradient(135deg, #ffecd2, #fcb69f)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fad0c4, #ffd1ff)',
    'linear-gradient(135deg, #81c784, #4caf50)',
    'linear-gradient(135deg, #64b5f6, #1976d2)'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    treeCount: 0,
    lantingTrees: 0,
    timeSequenceTrees: 0,
    consumedTrees: 0,
    isVIP: false,
    memberExpireTime: '', // 会员过期时间
    isLoggedIn: false, // 登录状态标志
    username: '未登录',
    userId: '', // 用户编号
    avatarUrl: '',
    randomAvatarBg: '', // 随机头像背景色
    currentSeason: {
      name: '',
      date: '',
      currentMonth: '',
      currentDay: '',
      description: '',
      quote: '',
      imageUrl: '' // 添加图片字段
    },
    nextSeasonName: '', // 下一个节气名称
    daysToNextSeason: 0, // 距离下一个节气的天数
    footprints: [], // 用户足迹数据
    activities: [], // 用户活动记录
    // 关于我们弹窗
    showAboutDialog: false,
    showTreeRulesDialog: false,
    showTreeExchangeDialog: false,
    aboutInfo: {
      name: '小舟摇风溪',
      version: 'v1.0.0',
      description: '小舟摇风溪是一款基于二十四节气的地理时节探索小程序，致力于在传承和推广中国传统节气文化的同时，带领大家足不出户"看"世界！',
      copyright: '© 2025 小舟摇学习团队',
      email: 'xiao_shi_jie@126.com'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化随机头像背景颜色
    this.setData({
      randomAvatarBg: generateRandomAvatarBg()
    });
    
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      // 未登录状态，清除用户相关的本地数据，但保留节气信息
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('city_footprints');
      wx.removeStorageSync('timeSequenceTrees');
      wx.removeStorageSync('lantingTrees');
      wx.removeStorageSync('treeCount');
      wx.removeStorageSync('consumedTrees');
      
      // 重置全局数据
      const app = getApp();
      if (app.globalData) {
        app.globalData.userInfo = null;
        app.globalData.timeSequenceTrees = 0;
        app.globalData.lantingTrees = 0;
        app.globalData.treeCount = 0;
        app.globalData.consumedTrees = 0;
      }
      
      this.setData({
        isLoggedIn: false,
        username: '未登录',
        // 不设置avatarUrl，保持初始空值，让默认头像显示
        isVIP: false,
        memberExpireTime: '', // 清除会员到期时间
        lantingTrees: 0,
        timeSequenceTrees: 0,
        consumedTrees: 0,
        treeCount: 0,
        footprints: [],
        activities: []
      });
    }
    
    // 获取各种树的数量
    const app = getApp();
    if (app.globalData) {
      const lantingTrees = app.globalData.lantingTrees || 0;
      const timeSequenceTrees = app.globalData.timeSequenceTrees || 0;
      const consumedTrees = app.globalData.consumedTrees || 0;
      const treeCount = app.globalData.treeCount || 0;
      
      this.setData({
        lantingTrees: lantingTrees,
        timeSequenceTrees: timeSequenceTrees,
        consumedTrees: consumedTrees,
        treeCount: treeCount
      });
    } else {
      // 如果全局数据不存在，尝试从本地存储获取
      const lantingTrees = wx.getStorageSync('lantingTrees') || 0;
      const timeSequenceTrees = wx.getStorageSync('timeSequenceTrees') || 0;
      const consumedTrees = wx.getStorageSync('consumedTrees') || 0;
      const treeCount = wx.getStorageSync('treeCount') || 0;
      
      this.setData({
        lantingTrees: lantingTrees,
        timeSequenceTrees: timeSequenceTrees,
        consumedTrees: consumedTrees,
        treeCount: treeCount
      });
    }
    
    // 加载用户信息（如果已登录）
    if (userInfo && userInfo.openid) {
      this.loadUserInfo();
    }
    
    // 更新当前时节信息（无论是否登录都需要）
    this.updateCurrentSeason();

    // 加载用户足迹（如果已登录）
    if (userInfo && userInfo.openid) {
      this.loadUserFootprints();
      this.loadUserActivities();
    }
  },

  /**
   * 加载用户信息
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
          
          // 处理头像URL的跨域问题
          const processedAvatarUrl = userData.avatarUrl ? await getTemporaryImageUrl(userData.avatarUrl, '用户头像') : '';
          
          // 更新页面显示
          const updateData = {
            isLoggedIn: true,
            username: userData.username || '小舟用户',
            userId: userData.userId || '', // 添加用户编号
            isVIP: userData.isVIP || false,
            memberExpireTime: this.formatMemberExpireTime(userData.memberExpireTime),
            lantingTrees: userData.lantingTrees || 0,
            timeSequenceTrees: userData.timeSequenceTrees || 0,
            consumedTrees: userData.consumedTrees || 0,
            treeCount: userData.treeCount || 0
          };
          
          // 只有当有头像时才设置avatarUrl，避免重复设置空值导致闪烁
          if (processedAvatarUrl) {
            updateData.avatarUrl = processedAvatarUrl;
          }
          
          this.setData(updateData);
        } else {
          // 用户信息获取失败，清除本地存储
          wx.removeStorageSync('userInfo');
          this.setData({
            isLoggedIn: false,
            username: '未登录',
            userId: '', // 清空用户编号
            // 不设置avatarUrl，让其保持当前状态
            isVIP: false,
            memberExpireTime: '',
            lantingTrees: 0,
            timeSequenceTrees: 0,
            consumedTrees: 0,
            treeCount: 0
          });
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
        // 发生错误时也清除本地存储
        wx.removeStorageSync('userInfo');
        this.setData({
          isLoggedIn: false,
          username: '未登录',
          userId: '', // 清空用户编号
          avatarUrl: '',
          isVIP: false,
          memberExpireTime: '',
          lantingTrees: 0,
          timeSequenceTrees: 0,
          consumedTrees: 0,
          treeCount: 0
        });
      }
    } else {
      // 用户未登录
      this.setData({
        isLoggedIn: false,
        username: '未登录',
        userId: '', // 清空用户编号
        avatarUrl: '',
        isVIP: false,
        memberExpireTime: '',
        lantingTrees: 0,
        timeSequenceTrees: 0,
        consumedTrees: 0,
        treeCount: 0
      });
    }
  },

  /**
   * 格式化会员过期时间
   */
  formatMemberExpireTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 处理一键登录
   */
  async handleLogin() {
    try {
      // 获取用户信息
      const userProfile = await wx.getUserProfile({
        desc: '用于完善会员资料'
      });

      wx.showLoading({
        title: '登录中...',
        mask: true
      });

      // 调用云函数进行登录
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await cloud.init();
      const loginResult = await cloud.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'login',
          data: {
            userInfo: userProfile.userInfo
          }
        }
      });

      if (loginResult.result.success) {
        const userData = loginResult.result.data;
        // 保存用户信息到本地
        wx.setStorageSync('userInfo', userData);
        
        // 处理头像URL的跨域问题
        const processedAvatarUrl = userData.avatarUrl ? await getTemporaryImageUrl(userData.avatarUrl, '用户头像') : '';
        
        // 更新页面显示
        this.setData({
          isLoggedIn: true,
          username: userData.username || '小舟用户',
          userId: userData.userId || '', // 添加用户编号
          avatarUrl: processedAvatarUrl,
          isVIP: userData.isVIP || false,
          memberExpireTime: this.formatMemberExpireTime(userData.memberExpireTime),
          lantingTrees: userData.lantingTrees || 0,
          timeSequenceTrees: userData.timeSequenceTrees || 0,
          consumedTrees: userData.consumedTrees || 0,
          treeCount: userData.treeCount || 0
        });

        // 显示欢迎消息
        wx.hideLoading();
        if (userData.is_new_user) {
          wx.showToast({
            title: '欢迎加入小舟摇风溪',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        }
      } else {
        wx.hideLoading();
        throw new Error('登录失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('登录失败:', err);
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      });
    }
  },

  /**
   * 更新用户信息
   */
  async updateUserInfo(newInfo) {
    try {
      wx.showLoading({
        title: '更新中...',
        mask: true
      });

      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await cloud.init();
      const updateResult = await cloud.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'updateUserInfo',
          data: newInfo
        }
      });

      if (updateResult.result.success) {
        // 重新加载用户信息
        await this.loadUserInfo();
        wx.hideLoading();
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        throw new Error('更新失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('更新用户信息失败:', err);
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    }
  },

  /**
   * 获取当前节气信息
   */
  async getCurrentSolarTerm() {
    try {
      // 调用云函数获取节气数据
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await cloud.init();
      const { result } = await cloud.callFunction({
        name: 'getSolarTerm'
      });

      if (result && result.success) {
        const { currentYear, currentMonth, currentDay, solarTerms } = result.data;
        
        // 当前日期字符串
        const currentDateStr = `${currentYear}年${currentMonth}月${currentDay}日`;
        
        // 找到当前节气
        let currentTerm = null;
        let nextTerm = null;
        
        // 遍历节气数据找到当前节气和下一个节气
        for (let i = 0; i < solarTerms.length; i++) {
          const term = solarTerms[i];
          
          // 如果节气在当前日期之前或就是今天
          if (term.month < currentMonth || (term.month === currentMonth && term.day <= currentDay)) {
            currentTerm = term;
            nextTerm = solarTerms[i + 1];
          } else {
            break;
          }
        }

        // 如果没找到当前节气，说明是在第一个节气之前，使用最后一个节气
        if (!currentTerm && solarTerms.length > 0) {
          currentTerm = solarTerms[solarTerms.length - 1];
          nextTerm = solarTerms[0];
        }

        // 如果没有下一个节气，说明是最后一个节气，下一个就是第一个节气
        if (!nextTerm && solarTerms.length > 0) {
          nextTerm = solarTerms[0];
        }

        // 计算到下一个节气的天数
        let daysToNext = 0;
        if (nextTerm) {
          const nextDate = new Date(currentYear, nextTerm.month - 1, nextTerm.day);
          const currentDate = new Date(currentYear, currentMonth - 1, currentDay);
          
          // 如果下一个节气的日期比当前日期小，说明是明年的节气
          if (nextDate < currentDate) {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          }
          
          daysToNext = Math.ceil((nextDate - currentDate) / (1000 * 60 * 60 * 24));
        }

        // 当前节气日期字符串（用于显示在节气名称旁边）
        const solarTermDateStr = currentTerm ? `${currentTerm.month}月${currentTerm.day}日` : '';

        // 更新页面数据
        if (currentTerm) {
          console.log('当前节气数据:', currentTerm);
          console.log('节气图片URL:', currentTerm.picture);
          
          // 处理时节图片的跨域问题
          const processedImageUrl = currentTerm.picture ? 
            await getTemporaryImageUrl(currentTerm.picture, '时节图片') : 
            '../../images/placeholder-a4.svg';
          
          console.log('处理后的图片URL:', processedImageUrl);
          
          this.setData({
            currentSeason: {
              name: currentTerm.name,
              date: solarTermDateStr,
              currentMonth: currentMonth,
              currentDay: currentDay,
              description: currentTerm.description,
              quote: currentTerm.quote,
              imageUrl: processedImageUrl // 使用处理后的图片URL
            },
            nextSeasonName: nextTerm ? nextTerm.name : '',
            daysToNextSeason: daysToNext
          });
          
          console.log('设置的currentSeason数据:', this.data.currentSeason);

          // 比较新旧数据，如果不同则更新并缓存
          const oldSeasonData = this.data.currentSeason;
          const newSeasonData = {
            currentSeason: {
              name: currentTerm.name,
              date: solarTermDateStr,
              currentMonth: currentMonth,
              currentDay: currentDay,
              description: currentTerm.description,
              quote: currentTerm.quote,
              imageUrl: processedImageUrl
            },
            nextSeasonName: nextTerm ? nextTerm.name : '',
            daysToNextSeason: daysToNext
          };

          if (JSON.stringify(oldSeasonData) !== JSON.stringify(newSeasonData.currentSeason) ||
              this.data.nextSeasonName !== newSeasonData.nextSeasonName ||
              this.data.daysToNextSeason !== newSeasonData.daysToNextSeason) {
            console.log('节气数据有变化，更新页面并刷新缓存');
            this.setData(newSeasonData);
            wx.setStorageSync('cachedSeasonData', newSeasonData);
            wx.setStorageSync('cacheTimestamp', Date.now());
          } else {
            console.log('节气数据无变化，无需更新');
          }
        }
      } else {
        throw new Error('获取节气数据失败');
      }
    } catch (error) {
      console.error('获取节气信息失败:', error);
    }
  },

  /**
   * 更新当前时节信息
   */
  updateCurrentSeason() {
    const cachedSeasonData = wx.getStorageSync('cachedSeasonData');
    
    // 如果有缓存数据，先显示缓存数据
    if (cachedSeasonData) {
      console.log('先显示本地缓存的节气数据');
      this.setData({
        currentSeason: cachedSeasonData.currentSeason,
        nextSeasonName: cachedSeasonData.nextSeasonName,
        daysToNextSeason: cachedSeasonData.daysToNextSeason
      });
    }
    
    // 无论是否有缓存，都从数据库获取最新数据
    console.log('从数据库获取最新节气数据');
    this.getCurrentSolarTerm();
  },

  /**
   * 从本地计算获取节气信息
   */
  fetchSeasonData() {
    // 显示加载中
    wx.showLoading({
      title: '加载节气信息',
      mask: true
    });
    
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();

      // 二十四节气的具体日期（月-日）
      const solarTerms = [
        { name: '小寒', month: 1, day: 5 },
        { name: '大寒', month: 1, day: 20 },
        { name: '立春', month: 2, day: 4 },
        { name: '雨水', month: 2, day: 19 },
        { name: '惊蛰', month: 3, day: 5 },
        { name: '春分', month: 3, day: 20 },
        { name: '清明', month: 4, day: 5 },
        { name: '谷雨', month: 4, day: 20 },
        { name: '立夏', month: 5, day: 5 },
        { name: '小满', month: 5, day: 21 },
        { name: '芒种', month: 6, day: 6 },
        { name: '夏至', month: 6, day: 21 },
        { name: '小暑', month: 7, day: 7 },
        { name: '大暑', month: 7, day: 22 },
        { name: '立秋', month: 8, day: 7 },
        { name: '处暑', month: 8, day: 23 },
        { name: '白露', month: 9, day: 8 },
        { name: '秋分', month: 9, day: 23 },
        { name: '寒露', month: 10, day: 8 },
        { name: '霜降', month: 10, day: 23 },
        { name: '立冬', month: 11, day: 7 },
        { name: '小雪', month: 11, day: 22 },
        { name: '大雪', month: 12, day: 7 },
        { name: '冬至', month: 12, day: 22 }
      ];

      // 找到当前或最近的节气
      let currentTerm = null;
      let nextTerm = null;
      let daysToNext = 0;

      // 将当前日期转换为时间戳，用于比较
      const currentDate = new Date(year, month - 1, day).getTime();

      // 遍历节气数组，找到当前节气和下一个节气
      for (let i = 0; i < solarTerms.length; i++) {
        const term = solarTerms[i];
        const termDate = new Date(year, term.month - 1, term.day).getTime();
        
        if (currentDate >= termDate) {
          currentTerm = term;
          nextTerm = solarTerms[(i + 1) % solarTerms.length];
          
          // 计算到下一个节气的天数
          const nextTermDate = new Date(
            nextTerm.month < term.month ? year + 1 : year, 
            nextTerm.month - 1, 
            nextTerm.day
          ).getTime();
          daysToNext = Math.ceil((nextTermDate - currentDate) / (1000 * 60 * 60 * 24));
        }
      }

      // 如果没找到当前节气（说明在小寒之前），则当前节气是去年的冬至
      if (!currentTerm) {
        currentTerm = solarTerms[solarTerms.length - 1]; // 冬至
        nextTerm = solarTerms[0]; // 小寒
        
        // 计算到下一个节气（小寒）的天数
        const nextTermDate = new Date(year, nextTerm.month - 1, nextTerm.day).getTime();
        daysToNext = Math.ceil((nextTermDate - currentDate) / (1000 * 60 * 60 * 24));
      }

      // 节气描述信息
      const seasonDescriptions = {
        '小寒': { description: '小寒，天气寒冷，但还未到最冷的时候。', quote: '小寒天气冷，深院雪初晴。' },
        '大寒': { description: '大寒，一年中最冷的节气，寒潮频繁。', quote: '大寒风雪夜，寒冬已到时。' },
        '立春': { description: '立春是二十四节气的第一个节气，标志着万物闭藏的冬季已过去，开始进入风和日暖、万物生长的春季。', quote: '律回岁晚冰霜少，春到人间草木知。' },
        '雨水': { description: '雨水节气，意味着降雨开始增多，气温回升，冰雪融化。此时雨量较小，以小雨或毛毛雨为主。', quote: '好雨知时节，当春乃发生。' },
        '惊蛰': { description: '惊蛰时节，春雷始鸣，惊醒蛰伏于地下冬眠的昆虫。万物复苏，春耕开始。', quote: '春雷响处百虫惊，田家忙事农务新。' },
        '春分': { description: '春分日昼夜平分，气温回升加快，雨量增多，是春耕春种的重要节气。', quote: '春分日月同，寒尽暖相从。' },
        '清明': { description: '清明节气，气候清爽明朗，万物皆显生机勃勃。既是节气，也是中国重要的传统节日之一。', quote: '清明时节雨纷纷，路上行人欲断魂。' },
        '谷雨': { description: '谷雨时节雨水充沛，有利于谷类农作物生长，故名谷雨。', quote: '谷雨前后，种瓜点豆。' },
        '立夏': { description: '立夏，是夏季的开始，意味着气温升高，万物生长旺盛。', quote: '天地始交，万物并秀。' },
        '小满': { description: '小满，意味着夏熟作物籽粒开始饱满，但还未完全成熟。', quote: '小满江河漫，农事已繁忙。' },
        '芒种': { description: '芒种，麦类等有芒作物成熟，可以收获播种。', quote: '芒种节前后，遍地麦花香。' },
        '夏至': { description: '夏至这天是北半球一年中白昼最长的一天，太阳直射位置达到最北。', quote: '夏至阳光好，梅雨正绵绵。' },
        '小暑': { description: '小暑，天气开始炎热，但还未到最热的时候。', quote: '小暑渐炎热，荷花处处开。' },
        '大暑': { description: '大暑，一年中最热的节气，常有暴雨和雷暴天气。', quote: '大暑三伏天，赤日炎炎似火烧。' },
        '立秋': { description: '立秋，秋季的开始，天气由热转凉，暑气渐消。', quote: '一叶知秋意，孤城落日斜。' },
        '处暑': { description: '处暑，表示炎热已经结束，天气逐渐转凉爽。', quote: '处暑雨乍歇，凉飙新有声。' },
        '白露': { description: '白露，天气转凉，早晨草木上有白色露珠。', quote: '白露凄凄夜，寒声急暮蝉。' },
        '秋分': { description: '秋分日昼夜平分，秋意渐浓，天高气爽。', quote: '秋分夜半明，月与日争光。' },
        '寒露': { description: '寒露，天气渐冷，露水带有寒意。', quote: '寒露生微月，清光堪素娥。' },
        '霜降': { description: '霜降，天气已冷，开始有霜冻出现。', quote: '霜降水返壑，风落木归山。' },
        '立冬': { description: '立冬，冬季的开始，天气转寒，万物开始收藏。', quote: '立冬天地肃，风霜正苦寒。' },
        '小雪': { description: '小雪节气，天气渐冷，偶有小雪。时值深秋将尽、冬季将临之际，大地即将进入一段相对"休眠"的时期。', quote: '草枯鹰眼疾，雪尽马蹄轻。' },
        '大雪': { description: '大雪节气，意味着降雪的可能性和雪量增大。北方地区开始出现大范围降雪，气温显著下降。', quote: '燕山雪花大如席，片片吹落轩辕台。' },
        '冬至': { description: '冬至这天是北半球一年中白昼最短的一天，阳光最少。', quote: '冬至阳生春又来，春来不觉咏花开。' }
      };

      // 获取当前节气的描述信息
      const seasonInfo = seasonDescriptions[currentTerm.name] || {
        description: '暂无该节气的详细介绍。',
        quote: '静以修身，俭以养德。'
      };

      // 更新UI展示
      this.setData({
        currentSeason: {
          name: currentTerm.name,
          date: `${year}年${month}月${day}日`,
          currentMonth: month,
          currentDay: day,
          description: seasonInfo.description,
          quote: seasonInfo.quote
        },
        nextSeasonName: nextTerm.name,
        daysToNextSeason: daysToNext
      });

      // 缓存数据
      wx.setStorageSync('season_data', {
        data: {
          currentSeason: this.data.currentSeason,
          nextSeasonName: nextTerm.name,
          daysToNextSeason: daysToNext,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('计算节气信息失败:', error);
      // 使用默认数据
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      this.setData({
        currentSeason: {
          name: '立秋',
          date: '8月7日', // 立秋的节气日期
          currentMonth: month,
          currentDay: day,
          description: '立秋是二十四节气之一，表示秋天的开始。天气由热转凉，暑气渐消。',
          quote: '一叶知秋意，孤城落日斜。'
        },
        nextSeasonName: '处暑',
        daysToNextSeason: 15
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 本地计算节气信息（API不可用时的备选方案）
   */
  calculateLocalSeasonInfo() {

    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // 简化的节气日期映射（实际项目应使用更准确的计算或从服务器获取）
    const solarTerms = [
      { name: '立春', month: 2, day: 4 },
      { name: '雨水', month: 2, day: 19 },
      { name: '惊蛰', month: 3, day: 5 },
      { name: '春分', month: 3, day: 20 },
      { name: '清明', month: 4, day: 5 },
      { name: '谷雨', month: 4, day: 20 },
      { name: '立夏', month: 5, day: 5 },
      { name: '小满', month: 5, day: 21 },
      { name: '芒种', month: 6, day: 6 },
      { name: '夏至', month: 6, day: 21 },
      { name: '小暑', month: 7, day: 7 },
      { name: '大暑', month: 7, day: 22 },
      { name: '立秋', month: 8, day: 7 },
      { name: '处暑', month: 8, day: 23 },
      { name: '白露', month: 9, day: 8 },
      { name: '秋分', month: 9, day: 23 },
      { name: '寒露', month: 10, day: 8 },
      { name: '霜降', month: 10, day: 23 },
      { name: '立冬', month: 11, day: 7 },
      { name: '小雪', month: 11, day: 22 },
      { name: '大雪', month: 12, day: 7 },
      { name: '冬至', month: 12, day: 22 },
      { name: '小寒', month: 1, day: 5 },
      { name: '大寒', month: 1, day: 20 }
    ];
    
    // 计算当前属于哪个节气以及下一个节气
    let currentTermIndex = -1;
    let nextTermIndex = -1;
    let isExactlyOnSolarTerm = false; // 是否正好处于节气当天
    let daysToNextSeason = 0;
    
    // 检查是否正好是某个节气的当天
    for (let i = 0; i < solarTerms.length; i++) {
      if (month === solarTerms[i].month && day === solarTerms[i].day) {
        currentTermIndex = i;
        nextTermIndex = (i + 1) % solarTerms.length; // 下一个节气
        isExactlyOnSolarTerm = true;
        break;
      }
    }
    
    // 如果不是节气当天，确定当前所处的节气区间
    if (!isExactlyOnSolarTerm) {
      let currentDate = new Date(now.getFullYear(), month - 1, day);
      
      // 为每个节气创建日期对象
      let termDates = solarTerms.map(term => {
        // 创建节气日期，考虑年份变化
        let year = now.getFullYear();
        
        // 如果当前是12月，但节气在1月，意味着是下一年的节气
        if (month === 12 && term.month === 1) {
          year += 1;
        }
        // 如果当前是1月，但节气在12月，意味着是上一年的节气
        else if (month === 1 && term.month === 12) {
          year -= 1;
        }
        
        return {
          term: term,
          date: new Date(year, term.month - 1, term.day)
        };
      });
      
      // 按日期排序
      termDates.sort((a, b) => a.date - b.date);
      
      // 找出当前日期所处的节气区间
      for (let i = 0; i < termDates.length; i++) {
        if (currentDate < termDates[i].date) {
          // 当前日期在这个节气之前，所以上一个节气是当前节气
          nextTermIndex = i;
          currentTermIndex = (i - 1 + termDates.length) % termDates.length;
          
          // 计算到下一个节气的天数
          const diffTime = termDates[i].date.getTime() - currentDate.getTime();
          daysToNextSeason = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          break;
        }
      }
      
      // 如果没找到，说明当前日期在最后一个节气之后，下一个就是下一年的第一个节气
      if (currentTermIndex === -1) {
        // 复制第一个节气并设置为下一年
        const firstTermNextYear = {
          term: solarTerms[0],
          date: new Date(now.getFullYear() + 1, solarTerms[0].month - 1, solarTerms[0].day)
        };
        
        currentTermIndex = termDates.length - 1;
        nextTermIndex = 0;
        
        // 计算到下一个节气的天数
        const diffTime = firstTermNextYear.date.getTime() - currentDate.getTime();
        daysToNextSeason = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    
    // 获取当前节气和下一个节气的信息
    const currentTerm = solarTerms[currentTermIndex];
    const nextTerm = solarTerms[nextTermIndex];
    
    // 获取详细信息
    let seasonInfo = this.getSeasonInfo(currentTerm.name);
    
    // 添加当前实际月份和日期，以及节气日期
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const solarTermDateStr = `${currentTerm.month}月${currentTerm.day}日`;
    
    // 更新数据
    this.setData({
      currentSeason: {
        ...seasonInfo,
        date: solarTermDateStr,
        currentMonth: currentMonth,
        currentDay: currentDay
      },
      isExactlyOnSolarTerm: isExactlyOnSolarTerm,
      nextSeasonName: nextTerm.name,
      daysToNextSeason: daysToNextSeason
    });
  },
  
  /**
   * 根据节气名称获取详细信息
   */
  getSeasonInfo(seasonName) {
    // 格式化日期函数（用于本地计算时的日期格式化）
    const formatDate = (year, month, day) => {
      return `${month}月${day}日`; // 返回节气日期格式
    };
    
    const currentYear = new Date().getFullYear();
    
    // 这些数据在实际项目中应从API获取
    const seasonMap = {
      '立春': {
        name: '立春',
        date: formatDate(currentYear, 2, 4),
        currentMonth: 2,
        currentDay: 4,
        description: '立春是二十四节气的第一个节气，标志着万物闭藏的冬季已过去，开始进入风和日暖、万物生长的春季。',
        quote: '律回岁晚冰霜少，春到人间草木知。',
        imageUrl: '../../images/season-lichun.jpg'
      },
      '雨水': {
        name: '雨水',
        date: formatDate(currentYear, 2, 19),
        currentMonth: 2,
        currentDay: 19,
        description: '雨水节气，意味着降雨开始增多，气温回升，冰雪融化。此时雨量较小，以小雨或毛毛雨为主。',
        quote: '好雨知时节，当春乃发生。',
        imageUrl: '../../images/season-yushui.jpg'
      },
      '清明': {
        name: '清明',
        date: formatDate(currentYear, 4, 5),
        currentMonth: 4,
        currentDay: 5,
        description: '清明节气，气候清爽明朗，万物皆显生机勃勃。既是节气，也是中国重要的传统节日之一。',
        quote: '清明时节雨纷纷，路上行人欲断魂。',
        imageUrl: '../../images/season-qingming.jpg'
      },
      '小雪': {
        name: '小雪',
        date: formatDate(currentYear, 11, 22),
        currentMonth: 11,
        currentDay: 22,
        description: '小雪节气，天气渐冷，偶有小雪。时值深秋将尽、冬季将临之际，大地即将进入一段相对"休眠"的时期。',
        quote: '草枯鹰眼疾，雪尽马蹄轻。',
        imageUrl: '../../images/season-current.jpg'
      },
      '大雪': {
        name: '大雪',
        date: formatDate(currentYear, 12, 7),
        currentMonth: 12,
        currentDay: 7,
        description: '大雪节气，意味着降雪的可能性和雪量增大。北方地区开始出现大范围降雪，气温显著下降。',
        quote: '燕山雪花大如席，片片吹落轩辕台。',
        imageUrl: '../../images/season-daxue.jpg'
      }
      // 可以添加其他节气...
    };
    
    // 如果没有该节气的信息，返回默认信息
    return seasonMap[seasonName] || {
      name: seasonName,
      date: '1月1日', // 节气日期格式
      currentMonth: 1,
      currentDay: 1,
      description: '暂无该节气的详细介绍。',
      quote: '静以修身，俭以养德。',
      imageUrl: '../../images/season-default.jpg'
    };
  },

  /**
   * 开通会员
   */
  upgradeMembership() {
    wx.navigateTo({
      url: '/pages/membership/index'
    });
  },

  /**
   * 导航到其他页面
   */
  navigateTo(e) {
    const page = e.currentTarget.dataset.page;
    
    // 使用switchTab而不是navigateTo，因为这些都是Tab页面
    wx.switchTab({
      url: `/pages/${page}/index`
    });
  },

  /**
   * 打开设置页面
   */
  openSettings: function() {
    // 尝试从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {
      username: '晓时用户',
      avatarUrl: ''
    };
    
    wx.showActionSheet({
      itemList: ['设置用户名', '上传头像'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 设置用户名
          wx.showModal({
            title: '设置用户名',
            placeholderText: '请输入您的用户名',
            editable: true,
            success: async (res) => {
              if (res.confirm && res.content) {
                try {
                  // 调用云函数更新用户信息
                  await this.updateUserInfo({
                  username: res.content
                });
                } catch (err) {
                  console.error('更新用户名失败:', err);
              wx.showToast({
                    title: '更新失败',
                    icon: 'error'
                });
                }
              }
            }
          });
        } else if (res.tapIndex === 1) {
          // 选择图片作为头像
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            camera: 'back',
            success: async (res) => {
              const tempFilePath = res.tempFiles[0].tempFilePath;
              
              try {
                // 上传图片到云存储 - 使用跨环境调用
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
                const uploadResult = await c.uploadFile({
                  cloudPath: `avatars/${Date.now()}.${tempFilePath.split('.').pop()}`,
                  filePath: tempFilePath
                });
                
                // 调用云函数更新用户信息
                await this.updateUserInfo({
                  avatarUrl: uploadResult.fileID
              });
              } catch (err) {
                console.error('更新头像失败:', err);
              wx.showToast({
                  title: '更新失败',
                  icon: 'error'
              });
              }
            }
          });
        }
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时，重新获取各种树的数量
    const app = getApp();
    if (app.globalData) {
      const lantingTrees = app.globalData.lantingTrees || 0;
      const timeSequenceTrees = app.globalData.timeSequenceTrees || 0;
      const consumedTrees = app.globalData.consumedTrees || 0;
      const treeCount = app.globalData.treeCount || 0;
      
      this.setData({
        lantingTrees: lantingTrees,
        timeSequenceTrees: timeSequenceTrees,
        consumedTrees: consumedTrees,
        treeCount: treeCount
      });
    }
    
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.openid) {
      // 已登录，重新加载用户信息
      this.loadUserInfo();
      
      // 检查会员状态
      this.checkUserMemberStatus();

      // 更新用户足迹数据（每次页面显示时刷新）
      this.loadUserFootprints();
      
      // 重新加载活动记录
      this.loadUserActivities();
    } else {
      // 未登录，清除会员相关信息
      this.setData({
        isLoggedIn: false,
        username: '未登录',
        isVIP: false,
        memberExpireTime: '',
        footprints: [],
        activities: []
      });
    }
  },

  /**
   * 检查用户会员状态
   */
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

      if (res.result && res.result.success) {
        const { isVIP, memberExpireTime } = res.result;
        const updateData = {
          isVIP: isVIP
        };
        // 只有当memberExpireTime有值时才更新，避免覆盖loadUserInfo中设置的值
        if (memberExpireTime) {
          updateData.memberExpireTime = this.formatMemberExpireTime(memberExpireTime);
        }
        this.setData(updateData);
      } else {
        this.setData({
          isVIP: false,
          memberExpireTime: ''
        });
      }
    } catch (error) {
      console.error('检查会员状态失败:', error);
      this.setData({
        isVIP: false,
        memberExpireTime: ''
      });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

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
    return {
      title: '小舟摇风溪',
      path: '/pages/cloudDwelling/index'
    };
  },

  /**
   * 加载用户足迹数据
   */
  async loadUserFootprints() {
    try {
      // 检查登录状态
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.openid) {
        console.log('用户未登录，不加载足迹数据');
        this.setData({
          footprints: []
        });
        return;
      }

      // 从云数据库获取足迹数据
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await cloud.init();
      const { result } = await cloud.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getUserFootprints'
        }
      });

      if (!result.success) {
        throw new Error('从云数据库获取足迹失败');
      }

      // 获取云端足迹数据
      const cloudFootprints = result.data || [];
      
      // 对足迹按时间排序，最新的排在前面
      cloudFootprints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // 只显示最新的5个足迹
      const recentFootprints = cloudFootprints.slice(0, 5);
      
      // 更新本地存储
      wx.setStorageSync('city_footprints', cloudFootprints);
      
      this.setData({
        footprints: recentFootprints
      });
    } catch (error) {
      console.error('加载足迹失败', error);
      this.setData({
        footprints: []
      });
    }
  },

  /**
   * 加载用户活动记录
   */
  async loadUserActivities() {
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      console.log('用户未登录，不加载活动记录');
      this.setData({
        activities: []
      });
      return;
    }

    wx.showLoading({
      title: '加载中...'
    });
    
    try {
      console.log('开始加载用户活动记录');
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await cloud.init();
      const result = await cloud.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getUserActivities'
        }
      });

      console.log('获取到的活动记录:', result);

      if (result.result && result.result.success) {
        // 检查是否有数据
        if (result.result.data && result.result.data.length > 0) {
          console.log('活动记录数据:', result.result.data);
          this.setData({
            activities: result.result.data
          }, () => {
            console.log('活动数据已更新到页面:', this.data.activities);
          });
        } else {
          console.log('暂无活动记录');
          this.setData({
            activities: []
          });
        }
      } else {
        console.error('获取活动记录失败:', result.result?.error);
        this.setData({
          activities: []
        });
      }
    } catch (error) {
      console.error('加载活动记录失败:', error);
      this.setData({
        activities: []
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 查看某个足迹对应的城市详情
   */
  viewFootprintCity(e) {
    const city = e.currentTarget.dataset.city;
    // 跳转到时城漫游页面并传入城市ID
    wx.navigateTo({
      url: `/pages/timeSequence/index?cityId=${city.cityId}`
    });
  },

  /**
   * 查看全部足迹记录
   */
  viewAllFootprints() {
    // 可以跳转到一个专门的足迹列表页面
    wx.navigateTo({
      url: '/pages/footprints/index'
    });
  },

  /**
   * 导航到系统页面
   */
  navigateToSystemPage(e) {
    const page = e.currentTarget.dataset.page;
    
    if (page === 'about') {
      // 显示关于我们弹窗
      this.setData({
        showAboutDialog: true
      });
      return;
    }
    
    let url = '';
    
    // 根据不同的页面类型跳转到不同的路径
    switch(page) {
      case 'userAgreement':
        url = '/pages/agreement/index?type=user';
        break;
      case 'privacyPolicy':
        url = '/pages/agreement/index?type=privacy';
        break;
      case 'contactUs':
        url = '/pages/contact/index';
        break;
      default:
        return;
    }
    
    wx.navigateTo({
      url: url
    });
  },
  
  /**
   * 关闭关于我们弹窗
   */
  closeAboutDialog() {
    this.setData({
      showAboutDialog: false
    });
  },

  /**
   * 显示小树规则弹窗
   */
  showTreeRules() {
    this.setData({
      showTreeRulesDialog: true
    });
  },

  /**
   * 关闭小树规则弹窗
   */
  closeTreeRulesDialog() {
    this.setData({
      showTreeRulesDialog: false
    });
  },

  /**
   * 显示小树兑换弹窗
   */
  showTreeExchangeDialog() {
    this.setData({
      showTreeExchangeDialog: true
    });
  },

  /**
   * 关闭小树兑换弹窗
   */
  closeTreeExchangeDialog() {
    this.setData({
      showTreeExchangeDialog: false
    });
  },

  /**
   * 兑换会员
   */
  async exchangeMembership(e) {
    const { days, cost } = e.currentTarget.dataset;
    const treeCost = parseInt(cost);
    const membershipDays = parseInt(days);
    
    // 检查小树数量是否足够
    if (this.data.treeCount < treeCost) {
      wx.showToast({
        title: '小树数量不足',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 确认兑换
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '确认兑换',
        content: `确定要消耗 ${treeCost} 棵小树兑换 ${membershipDays} 天会员吗？`,
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false)
      });
    });
    
    if (!confirmResult) {
      return;
    }
    
    try {
      wx.showLoading({
        title: '兑换中...',
        mask: true
      });

      // 调用云函数处理兑换
      // 创建跨环境调用的Cloud实例
      const cloud = new wx.cloud.Cloud({ 
        identityless: true, 
        resourceAppid: 'wx85d92d28575a70f4', 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
        }); 
        await cloud.init();
        // 消耗树苗（增量更新）
        const result = await cloud.callFunction({
        name: 'getMembershipInfo',
        data: {
          action: 'exchangeMembership',
          days: membershipDays,
          treeCost: treeCost
        }
      });
      
      wx.hideLoading();
      
      if (result.result.code === 0) {
         // 使用云函数返回的数据更新本地状态
         const { newTreeCount, newConsumedTrees, isVip } = result.result.data;
         
         this.setData({
           treeCount: newTreeCount,
           consumedTrees: newConsumedTrees,
           isVIP: isVip,
           showTreeExchangeDialog: false
         });
        
        wx.showToast({
          title: result.result.msg,
          icon: 'success',
          duration: 3000
        });
        
        // 刷新用户信息
        this.loadUserInfo();
      } else {
        wx.showToast({
          title: result.result.msg || '兑换失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('兑换会员失败:', error);
      wx.showToast({
        title: '兑换失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  /**
   * 复制邮箱
   */
  copyEmail() {
    wx.setClipboardData({
      data: this.data.aboutInfo.email,
      success() {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 复制用户编号
   */
  copyUserId() {
    if (!this.data.userId) {
      wx.showToast({
        title: '用户编号不存在',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: this.data.userId,
      success() {
        wx.showToast({
          title: '用户编号已复制',
          icon: 'success'
        });
      },
      fail() {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },
  
  /**
   * 阻止事件冒泡
   */
  catchDialogTap() {
    // 防止点击弹窗内容时关闭弹窗
    return;
  },
  
  /**
   * 清除缓存
   */
  clearCache() {
    wx.showModal({
      title: '清除所有缓存',
      content: '确定要清除所有本地缓存吗？包括阵营信息，系统会从数据库重新加载。',
      success: (res) => {
        if (res.confirm) {
          // 清除所有缓存（不保留任何信息）
          wx.clearStorageSync();

          wx.showToast({
            title: '所有缓存已清除',
            icon: 'success'
          });

          // 提示用户重新进入页面
          setTimeout(() => {
            wx.showModal({
              title: '缓存清除完成',
              content: '所有本地数据已清除，请重新进入兰亭页面以重新加载阵营信息。',
              showCancel: false,
              confirmText: '知道了'
            });
          }, 1500);
        }
      }
    });
  },

  /**
   * 获取微信手机号并登录
   */
  getPhoneNumber: function(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 用户同意授权手机号
      // 正常情况下，这里要将 e.detail.code 发送到服务端，换取手机号
      // 出于演示目的，这里直接模拟成功获取手机号

      wx.showLoading({
        title: '登录中...',
        mask: true
      });

      // 模拟网络请求延迟
      setTimeout(() => {
        // 创建用户信息
        const userInfo = {
          username: '晓时用户',
          avatarUrl: '',
          phoneNumber: '已授权' // 实际应用中这里会是真实手机号
        };
        
        // 保存到本地
        wx.setStorageSync('userInfo', userInfo);
        
        // 更新页面数据
        this.setData({
          isLoggedIn: true,
          username: userInfo.username
        });
        
        wx.hideLoading();
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      }, 1000);
    } else {
      // 用户拒绝授权手机号
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }
  },

    logout: function() {
        const that = this;
        wx.showModal({
            title: '确认退出',
            content: '您确定要退出登录吗?',
            success(res) {
                if (res.confirm) {
                    // 用户点击确定，执行退出登录操作
                    wx.removeStorageSync('userInfo');
                    wx.removeStorageSync('city_footprints');
                    wx.removeStorageSync('timeSequenceTrees');
                    wx.removeStorageSync('lantingTrees');
                    wx.removeStorageSync('treeCount');
                    wx.removeStorageSync('consumedTrees');
                    // 重置全局数据
                    getApp().globalData.userInfo = null;
                    getApp().globalData.isLoggedIn = false;
                    getApp().globalData.city_footprints = [];
                    getApp().globalData.timeSequenceTrees = [];
                    getApp().globalData.lantingTrees = [];
                    getApp().globalData.treeCount = 0;
                    getApp().globalData.consumedTrees = 0;
                    getApp().globalData.memberInfo = null;
                    getApp().globalData.isMember = false;
                    getApp().globalData.memberExpireTime = null;
                    getApp().globalData.memberLevel = 0;

                    that.setData({
                        userInfo: null,
                        isLoggedIn: false,
                        city_footprints: [],
                        timeSequenceTrees: [],
                        lantingTrees: [],
                        treeCount: 0,
                        consumedTrees: 0,
                        memberInfo: null,
                        isMember: false,
                        memberExpireTime: null,
                        memberLevel: 0
                    });

                    wx.showToast({
                        title: '已退出登录',
                        icon: 'success',
                        duration: 1500
                    });
                } else if (res.cancel) {
                    // 用户点击取消，不执行任何操作
                    console.log('用户点击取消');
                }
            }
        });
    },
});