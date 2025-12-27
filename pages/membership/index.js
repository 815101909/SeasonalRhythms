Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    imageUrl: '',   // 会员宣传图片URL
    membershipInfo: {
      prices: []    // 价格方案
    },
    selectedPlan: 0,  // 默认选中的会员方案
    isVIP: false, // 用户会员状态
    activationCode: '', // 激活码
  },

  /**
   * 监听激活码输入
   */
  onActivationCodeInput(e) {
    this.setData({
      activationCode: e.detail.value
    });
  },

  /**
   * 兑换激活码
   */
  async redeemActivationCode() {
    const code = this.data.activationCode.trim();
    if (!code) {
      wx.showToast({
        title: '请输入激活码',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '正在兑换...',
      mask: true
    });

    try {
      const c = await this.getCloudInstance();
      const res = await c.callFunction({
        name: 'xsj_pay',
        data: {
          action: 'redeemCode',
          code: code
        }
      });

      console.log('兑换结果:', res);
      
      if (res.result && res.result.success) {
        this.setData({
          activationCode: '' // 清空输入框
        });
        
        wx.hideLoading();
        
        wx.showModal({
          title: '兑换成功',
          content: res.result.msg || '激活码兑换成功，会员权益已生效',
          showCancel: false,
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 刷新会员状态，传入参数不显示loading
              this.checkUserMemberStatus(false);
            }
          }
        });
        
      } else {
        wx.showToast({
          title: res.result.errmsg || '兑换失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('兑换激活码异常:', err);
      wx.hideLoading();
      wx.showToast({
        title: '兑换异常，请稍后重试',
        icon: 'none'
      });
    }
  },

  // 获取云函数实例
  async getCloudInstance() {
    if (!this._cloudInstance) {
      this._cloudInstance = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef',
      });
      await this._cloudInstance.init();
    }
    return this._cloudInstance;
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 加载会员信息
    this.fetchMembershipInfo();
    // 加载会员宣传图
    this.loadMembershipImage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 检查会员状态
    this.checkUserMemberStatus();
  },

  /**
   * 从后端获取会员信息
   */
  async fetchMembershipInfo() {
    wx.showLoading({
      title: '加载中',
    });
    try {
      const c = await this.getCloudInstance();

      const res = await c.callFunction({
        name: 'getMembershipInfo',
      });

      if (res.result && res.result.code === 0) {
        let allPrices = [];
        if (Array.isArray(res.result.data)) {
          allPrices = res.result.data;
        }

        this.setData({
          'membershipInfo.prices': allPrices,
          loading: false
        });
      } else {
        console.error('获取会员信息失败:', res.result ? res.result.msg : '未知错误');
        this.loadFallbackData();
      }
    } catch (err) {
      console.error('调用云函数获取会员信息异常', err);
      this.loadFallbackData();
    } finally {
      wx.hideLoading();
    }
  },
  
  /**
   * 获取云实例
   */
  async getCloudInstance() {
    const cloudInstance = new wx.cloud.Cloud({
      identityless: true,
      resourceAppid: 'wx85d92d28575a70f4',
      resourceEnv: 'cloud1-1gsyt78b92c539ef',
    });
    
    try {
      await cloudInstance.init(); // 确保云实例初始化完成
      return cloudInstance;
    } catch (error) {
      console.error('云实例初始化失败:', error);
      // 降级到默认云实例
      return wx.cloud;
    }
  },

  /**
   * 加载会员宣传图
   */
  async loadMembershipImage() {
    const cloudImageUrl = 'cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/membership/小舟摇风溪会员.jpg';
    const cacheKey = 'membership_image_cache';
    const cacheExpirationTime = 60 * 60 * 1000; // 1小时缓存时间
    
    try {
      // 检查本地缓存
      const cachedData = wx.getStorageSync(cacheKey);
      if (cachedData && cachedData.url && (Date.now() - cachedData.timestamp < cacheExpirationTime)) {
        console.log('使用缓存的会员宣传图');
        this.setData({
          imageUrl: cachedData.url
        });
        return;
      }
      
      // 缓存过期或不存在，重新获取临时链接
      console.log('获取会员宣传图临时链接');
      const c = await this.getCloudInstance();
      const result = await c.getTempFileURL({
        fileList: [cloudImageUrl]
      });
      
      if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
        const tempUrl = result.fileList[0].tempFileURL;
        
        // 更新页面显示
        this.setData({
          imageUrl: tempUrl
        });
        
        // 保存到本地缓存
        wx.setStorageSync(cacheKey, {
          url: tempUrl,
          timestamp: Date.now()
        });
        
        console.log('会员宣传图加载成功并已缓存');
      } else {
        console.error('获取会员宣传图临时链接失败:', result);
        this.setFallbackImage();
      }
    } catch (error) {
      console.error('加载会员宣传图失败:', error);
      this.setFallbackImage();
    }
  },
  
  /**
   * 设置备用图片
   */
  setFallbackImage() {
    this.setData({
      imageUrl: '../../images/membership-banner.png' // 本地备用图片
    });
  },

  /**
   * 加载备用数据（当API不可用时）
   */
  loadFallbackData() {
    // 提供默认会员信息作为备用
    this.setData({
      membershipInfo: {
        prices: [
          { id: 1, name: '月卡', price: 15, original: 30, unit: '元/月' },
          { id: 2, name: '季卡', price: 39, original: 78, unit: '元/季', recommend: true },
          { id: 3, name: '年卡', price: 128, original: 288, unit: '元/年' }
        ]
      },
      loading: false
    });
  },
  
  /**
   * 选择会员方案
   */
  selectPlan(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedPlan: index
    });
  },
  
  /**
   * 购买会员
   */
  async purchaseMembership() {
    const selectedPlan = this.data.membershipInfo.prices[this.data.selectedPlan];
    
    if (!selectedPlan) {
      wx.showToast({
        title: '请选择会员方案',
        icon: 'none'
      });
      return;
    }

    // 添加参数验证和日志
    console.log('选中的会员方案:', selectedPlan);
    console.log('价格:', selectedPlan.price);
    console.log('转换后金额(分):', selectedPlan.price * 100);

    if (!selectedPlan.price || selectedPlan.price <= 0) {
      wx.showToast({
        title: '价格信息异常',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '发起支付',
      mask: true
    });

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
      
      const paymentData = {
         description: `购买${selectedPlan.name}`,
         amount: {
           total: selectedPlan.price * 100, // 转换为分
           currency: 'CNY'
         },
         planId: selectedPlan.id,
         planName: selectedPlan.name
       };
       
       console.log('发送到云函数的数据:', paymentData);
       
       const res = await c.callFunction({
         name: 'xsj_pay',
         data: paymentData
       });
      
      console.log('云函数返回结果:', res);
       wx.hideLoading();
       
       if (res.result.errcode) {
         console.error('云函数返回错误:', res.result);
         wx.showToast({
           title: res.result.errmsg || '支付发起失败',
           icon: 'none'
         });
         return;
       }
       
       const { data, out_trade_no } = res.result;
       if (data) {
         wx.requestPayment({
           timeStamp: data.timeStamp,
           nonceStr: data.nonceStr,
           package: data.package,
           signType: data.signType,
           paySign: data.paySign,
          success: async(payRes) => {
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            });
            // 支付成功后调用云函数激活会员
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
              name: 'xsj_pay',
              data: {
                action: 'activateMember',
                outTradeNo: out_trade_no,
                transactionId: payRes.transaction_id,
                planId: selectedPlan.id,
                planName: selectedPlan.name
              }
            }).then(activateRes => {
              if (activateRes.result.success) {
                wx.showToast({
                  title: '会员已激活',
                  icon: 'success'
                });
                // 直接更新页面显示，不通过 globalData
                wx.removeStorageSync('hasShownExpiredModal'); // 清除会员过期弹窗标记
                this.checkUserMemberStatus(); // 重新检查会员状态以更新UI
                setTimeout(() => {
                  wx.navigateBack();
                }, 1500);
              } else {
                wx.showToast({
                  title: '激活失败',
                  icon: 'none'
                });
                console.error('会员激活失败', activateRes.result.errmsg);
              }
            }).catch(err => {
              console.error('调用激活会员云函数失败', err);
              wx.showToast({
                title: '激活异常',
                icon: 'none'
              });
            });
          },
          fail: async (err) => {
            console.error('支付失败', err);
            wx.showToast({
              title: '支付取消',
              icon: 'none'
            });
            // 支付失败，更新订单状态为失败
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
              name: 'xsj_pay',
              data: {
                action: 'updateMemberOrder',
                outTradeNo: out_trade_no,
                status: 'failed'
              }
            }).catch(err => {
              console.error('更新订单状态失败', err);
            });
          }
        });
      } else {
          wx.showToast({
            title: '支付数据异常',
            icon: 'none'
          });
        }
    } catch (err) {
      wx.hideLoading();
      console.error('调用支付云函数失败', err);
      wx.showToast({
        title: '网络错误或云函数调用失败',
        icon: 'none'
      });
    }
  },

  // 检查会员状态
  async checkUserMemberStatus(showLoading = true) {
    if (showLoading) {
      wx.showLoading({
        title: '加载中',
        mask: true
      });
    }
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
      const res = await c.callFunction({
        name: 'xsj_pay',
        data: {
          action: 'checkMemberStatus'
        }
      });
      console.log('checkMemberStatus 云函数返回:', res);
      if (res.result && res.result.success) {
        const { isVIP, memberExpireTime } = res.result;
        this.setData({
          isVIP: isVIP,
          memberExpireTime: memberExpireTime ? this.formatExpireTime(memberExpireTime) : ''
        });
      } else {
        console.error('获取会员状态失败', res.result);
        this.setData({
          isVIP: false,
          memberExpireTime: ''
        });
      }
    } catch (e) {
      console.error('调用云函数检查会员状态异常', e);
      this.setData({
        isVIP: false,
        memberExpireTime: ''
      });
    } finally {
      if (showLoading) {
        wx.hideLoading();
      }
    }
  },

  // 格式化过期时间
  formatExpireTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 返回上一页
   */
  navigateBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

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
      title: '小舟摇风溪会员 - 探索更多节气文化',
      path: '/pages/cloudDwelling/index'
    };
  }
})