App({
  onLaunch: function () {
    console.log('App launched');
    
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
  globalData: {
    userInfo: null,
    themeColor: '#e8f5e9',
    useCloudAPI: true,
    lantingTrees: 0,  // LanTing页面获得的小树
    timeSequenceTrees: 0, // 时序漫游获得的小树
    treeCount: 0,  // 总的小树数量（LanTing + TimeSequence - 已消费）
    consumedTrees: 0,  // 已消费的小树数量
    selectedCityId: null  // 从足迹页面选择的城市ID
  }
})