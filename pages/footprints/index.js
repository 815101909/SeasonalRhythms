// 足迹列表页面
Page({
  /**
   * 页面的初始数据
   */
  data: {
    footprints: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadFootprints();
  },

  /**
   * 加载足迹数据
   */
  async loadFootprints() {
    try {
      // 从云数据库获取足迹数据 - 使用跨环境调用
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
      
      // 更新本地存储
      wx.setStorageSync('city_footprints', cloudFootprints);
      
      this.setData({
        footprints: cloudFootprints
      });
    } catch (error) {
      console.error('加载足迹失败', error);
      // 如果云端获取失败，尝试从本地获取
      const localFootprints = wx.getStorageSync('city_footprints') || [];
      localFootprints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      this.setData({
        footprints: localFootprints
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 查看某个城市详情
   */
  viewCity: function (e) {
    const city = e.currentTarget.dataset.city;
    
    if (!city || !city.cityId) {
      wx.showToast({
        title: '城市数据错误',
        icon: 'none'
      });
      return;
    }
    
    // 将 cityId 存储到全局数据中
    const app = getApp();
    app.globalData.selectedCityId = city.cityId;
    
    // 使用 wx.switchTab 跳转到 tabBar 页面
    wx.switchTab({
      url: '/pages/timeSequence/index',
      fail: function(err) {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 返回上一页
   */
  goBack: function () {
    wx.navigateBack();
  },

  /**
   * 跳转到时城漫游页面
   */
  goToTimeSequence: function () {
    wx.navigateTo({
      url: '/pages/timeSequence/index'
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次显示页面时刷新足迹数据
    this.loadFootprints();
  },

  /**
   * 清除所有足迹
   */
  clearAllFootprints() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有足迹记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用云函数清除足迹 - 使用跨环境调用
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
            const result = await c.callFunction({
              name: 'xsj_auth',
              data: {
                action: 'clearUserFootprints'
              }
            });

            if (!result.result.success) {
              throw new Error('清除云数据库足迹失败');
            }

            // 清除本地存储
          wx.removeStorageSync('city_footprints');
            
          this.setData({
            footprints: []
          });
            
          wx.showToast({
            title: '足迹已清除',
            icon: 'success'
          });
          } catch (error) {
            console.error('清除足迹失败:', error);
            wx.showToast({
              title: '清除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  }
})