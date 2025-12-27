App({
  onLaunch: function (options) {
    console.log('App launched');
    console.log('启动参数:', options);
    
    // 保存启动场景值
    this.globalData.scene = options.scene;
    this.globalData.launchOptions = options;
    console.log('启动场景值:', options.scene);
    
    // 处理推荐人信息
    if (options.query && options.query.scene) {
      this.globalData.referrerCode = options.query.scene;
      console.log('获取到推荐人代码:', options.query.scene);
      
      // 保存到本地存储，确保不丢失
      wx.setStorageSync('referrerCode', options.query.scene);
    } else {
      // 如果启动参数中没有，尝试从本地存储获取
      const savedReferrerCode = wx.getStorageSync('referrerCode');
      if (savedReferrerCode) {
        this.globalData.referrerCode = savedReferrerCode;
        console.log('从本地存储获取推荐人代码:', savedReferrerCode);
      }
    }
    
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-1gsyt78b92c539ef', // 替换为您的云环境ID
        traceUser: true,
      })
    }
    
    // 初始化小树数量
    // 从本地存储获取树的数量
    const lantingTrees = wx.getStorageSync('lantingTrees') || 0;
    const timeSequenceTrees = wx.getStorageSync('timeSequenceTrees') || 0;
    const totalTrees = lantingTrees + timeSequenceTrees;
    const consumedTrees = wx.getStorageSync('consumedTrees') || 0;
    
    // 设置全局数据
    this.globalData.lantingTrees = lantingTrees;
    this.globalData.timeSequenceTrees = timeSequenceTrees;
    this.globalData.treeCount = totalTrees - consumedTrees; // 总树木数减去已消费树木数
    this.globalData.consumedTrees = consumedTrees;
  },

  onShow: function (options) {
    console.log('App onShow');
    console.log('切换到前台参数:', options);
    
    // 更新场景值
    if (options) {
      this.globalData.scene = options.scene;
      
      // 处理推荐人信息（从后台切换到前台时也可能携带推荐信息）
      if (options.query && options.query.scene) {
        this.globalData.referrerCode = options.query.scene;
        console.log('从后台切换获取到推荐人代码:', options.query.scene);
        
        // 保存到本地存储
        wx.setStorageSync('referrerCode', options.query.scene);
      }
    }
  },

  // 获取推荐人代码的方法
  getReferrerCode: function() {
    return this.globalData.referrerCode || wx.getStorageSync('referrerCode') || null;
  },

  // 清除推荐人代码（用户注册成功后调用）
  clearReferrerCode: function() {
    this.globalData.referrerCode = null;
    wx.removeStorageSync('referrerCode');
    console.log('推荐人代码已清除');
  },
  globalData: {
    userInfo: null,
    themeColor: '#e8f5e9',
    useCloudAPI: true,
    lantingTrees: 0,  // LanTing页面获得的小树
    timeSequenceTrees: 0, // 时序漫游获得的小树
    treeCount: 0,  // 总的小树数量（LanTing + TimeSequence - 已消费）
    consumedTrees: 0,  // 已消费的小树数量
    selectedCityId: null,  // 从足迹页面选择的城市ID
    referrerCode: null,  // 推荐码参数，用于新用户注册时关联推荐关系
    scene: null,  // 启动场景值
    launchOptions: null  // 完整的启动参数
  }
})