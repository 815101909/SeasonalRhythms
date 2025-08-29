Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 训练相关
    trainingFaction: '', // 'tower' 或 'rain'
    trainingType: '', // 'city' 或 'season'
    currentState: 'home', // 'home', 'training', 'result'
    questionType: 'single', // 'single', 'multi', 'fill'
    optionLetters: ['A', 'B', 'C', 'D', 'E', 'F'],
    
    // 题目数据
    singleQuestions: [],
    multipleQuestions: [],
    fillQuestions: [],
    questions: [],
    currentQuestionIndex: 0,
    currentQuestion: null,
    selectedOption: null,
    timeRemaining: 30,
    teamScores: [],
    showResult: false,
    resultData: {
      title: '',
      message: '',
      scores: [],
      reward: 0,
      isTraining: false
    },
    timerInterval: null,
    factionImages: {
      tower: 'pics/楼台烟雨中.jpg',
      rain: 'pics/好雨知时节.jpg'
    },
    towerMemberCount: 1256,  // 楼台烟雨中成员数
    rainMemberCount: 1378,   // 好雨知时节成员数
    leaderboardUsers: [],    // 排行榜用户
    trainingFaction: '',     // 当前训练的阵营
    answeredQuestions: 0,    // 已回答题目数量
    correctAnswers: 0,       // 正确回答数量
    correctRate: 0,          // 正确率
    dailyWinner: {           // 昨日获胜阵营
      faction: 'tower',
      score: 12580
    },
    isPkTime: false,         // 是否是PK时间（晚上7:30）
    pkCountdownText: '距离开始: --:--:--', // PK倒计时文本
    pkCountdownInterval: null, // PK倒计时定时器
    userFaction: '',          // 用户选择的阵营：'tower'或'rain'，空字符串表示未选择
    lantingTrees: 0,           // LanTing获得的小树数量
    
    // API预留端口
    trainingApiEndpoint: 'https://api.example.com/training', // 训练题目获取API
    questionType: 'single', // 'single'单选题, 'multi'多选题, 'fill'填空题
    trainingType: '', // 'city'城市训练, 'season'时节训练
    multipleQuestions: [], // 多选题列表
    fillQuestions: [], // 填空题列表
    singleQuestions: [], // 单选题列表
    currentQuestionList: [], // 当前题目类型的题目列表
    dailyTrainingCompleted: {
      city: false,
      season: false
    }, // 每日训练是否完成
    selectedOptions: {}, // 多选题的选中项，使用对象而不是数组
    fillAnswer: '', // 填空题答案
    fillAnswers: [], // 填空题答案数组，每个空对应一个答案
    totalQuestions: 0, // 总题目数量
    totalAllQuestions: 0, // 所有题目的总数
    userFaction: '',
    towerCount: 258,
    rainCount: 243,
    towerScore: 0,
    rainScore: 0,
    isPkTime: false,
    pkCountdownText: '',
    lantingTrees: 0,  // 用户的兰亭树苗数量
    myRanking: 0,     // 用户的排名
    currentState: 'home',
    lantingTrees: 0,
    dailyWinner: null,
    topThree: [],
    winnerFaction: '',   // 获胜阵营
    topThree: [],        // 前三名
    
    // 解释弹窗相关
    showExplanationModal: false,  // 是否显示解释弹窗
    explanationData: {            // 解释弹窗数据
      title: '',
      content: '',
      correctAnswer: '',
      userAnswer: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function() {
    try {
      // 从本地存储获取用户阵营信息
      const userFaction = wx.getStorageSync('userFaction');
      
      // 如果本地存储有阵营信息，验证其有效性
      if (userFaction) {
        // 调用云函数验证阵营信息 - 使用跨环境调用
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
          name: 'pkBattle',
          data: {
            action: 'getUserFaction'
          }
        });

        if (result.result && result.result.success) {
          const serverFaction = result.result.data.userFaction;
          if (serverFaction && serverFaction === userFaction) {
            // 服务器和本地阵营信息一致，设置阵营
            this.setData({
              userFaction: userFaction
            });
          } else {
            // 信息不一致，清除本地存储
            wx.removeStorageSync('userFaction');
            this.setData({
              userFaction: ''
            });
          }
        } else {
          // 验证失败，清除本地存储
          wx.removeStorageSync('userFaction');
          this.setData({
            userFaction: ''
          });
        }
      } else {
        // 本地没有阵营信息
        this.setData({
          userFaction: ''
        });
      }

      // 获取LanTing获得的小树数量
      const app = getApp();
      let lantingTrees = 0;
      if (app.globalData && app.globalData.lantingTrees !== undefined) {
        lantingTrees = app.globalData.lantingTrees;
      } else {
        // 如果全局数据不存在，尝试从本地存储获取
        lantingTrees = wx.getStorageSync('lantingTrees') || 0;
      }

      console.log('设置页面数据 - userFaction:', userFaction);
      this.setData({
        userFaction: userFaction,
        lantingTrees: lantingTrees
      });
      console.log('页面数据设置完成 - this.data.userFaction:', this.data.userFaction);

      // 模拟获取热门选手数据
      this.getLeaderboardData();

      // 开始PK倒计时
      this.startCountdown();

      // 获取排行榜数据
      await this.fetchRankingData();
    } catch (error) {
      console.error('页面加载失败:', error);
      // 发生错误时，确保清除可能无效的阵营信息
      wx.removeStorageSync('userFaction');
      this.setData({
        userFaction: ''
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 获取用户信息和树苗数量
    this.loadUserData();
    // 启动倒计时
    this.startCountdown();
  },

  /**
   * 强制刷新阵营信息（调试用）
   */
  async refreshFactionInfo() {
    console.log('开始强制刷新阵营信息...');
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
      const result = await c.callFunction({
        name: 'pkBattle',
        data: {
          action: 'getUserFaction'
        }
      });

      console.log('强制刷新 - 云函数调用结果:', result);

      if (result.result && result.result.success && result.result.data.userFaction) {
        const userFaction = result.result.data.userFaction;
        console.log('强制刷新 - 从数据库获取到阵营:', userFaction);

        // 更新本地存储
        wx.setStorageSync('userFaction', userFaction);

        // 更新页面显示
        this.setData({
          userFaction: userFaction
        });

        wx.showToast({
          title: `阵营已更新为${userFaction === 'tower' ? '楼台烟雨中' : '好雨知时节'}`,
          icon: 'success'
        });
      } else {
        console.log('强制刷新 - 数据库中未找到阵营信息');
        wx.showToast({
          title: '未找到阵营信息',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('强制刷新阵营信息失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      });
    }
  },

  /**
   * 加载用户数据
   */
  loadUserData: async function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      console.log('用户未登录');
      return;
    }

    try {
      // 获取用户信息 - 使用跨环境调用
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
          action: 'getUserInfo'
        }
      });

      if (result.result && result.result.success) {
        const userData = result.result.data;

        console.log('loadUserData - 当前页面阵营:', this.data.userFaction);
        console.log('loadUserData - 用户表阵营:', userData.faction);

        const updateData = {
          lantingTrees: userData.lantingTrees || 0
        };

        // 获取PK参与表中的最新阵营信息
        try {
          // 创建跨环境调用的Cloud实例
          var c2 = new wx.cloud.Cloud({ 
            // 必填，表示是未登录模式 
            identityless: true, 
            // 资源方 AppID 
            resourceAppid: 'wx85d92d28575a70f4', 
            // 资源方环境 ID 
            resourceEnv: 'cloud1-1gsyt78b92c539ef', 
          }) 
          await c2.init() 
          const factionResult = await c2.callFunction({
            name: 'pkBattle',
            data: {
              action: 'getUserFaction'
            }
          });

          console.log('loadUserData - PK表查询结果:', factionResult);

          if (factionResult.result && factionResult.result.success && factionResult.result.data.userFaction) {
            const pkFaction = factionResult.result.data.userFaction;
            console.log('loadUserData - PK表阵营:', pkFaction);
            console.log('loadUserData - 使用PK表最新阵营信息:', pkFaction);
            updateData.userFaction = pkFaction;
            // 同时更新本地存储
            wx.setStorageSync('userFaction', pkFaction);
          } else {
            // 如果PK表中没有阵营信息，使用用户表的阵营信息
            if (userData.faction) {
              console.log('loadUserData - PK表无阵营，使用用户表阵营:', userData.faction);
              updateData.userFaction = userData.faction;
              wx.setStorageSync('userFaction', userData.faction);
            } else {
              console.log('loadUserData - 两个表都没有阵营信息');
            }
          }
        } catch (factionError) {
          console.error('loadUserData - 获取PK阵营失败:', factionError);
          // 如果获取PK阵营失败，使用用户表的阵营信息
          if (userData.faction) {
            console.log('loadUserData - PK查询失败，使用用户表阵营:', userData.faction);
            updateData.userFaction = userData.faction;
            wx.setStorageSync('userFaction', userData.faction);
          }
        }

        this.setData(updateData);
        console.log('loadUserData - 更新后页面阵营:', this.data.userFaction);

        // 同步到全局数据
        const app = getApp();
        if (app.globalData) {
          app.globalData.lantingTrees = userData.lantingTrees || 0;
        }
      }

      // 获取用户排名 - 使用跨环境调用
      // 创建跨环境调用的Cloud实例
      var c3 = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      await c3.init() 
      const rankingResult = await c3.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getUserRanking'
        }
      });

      if (rankingResult.result && rankingResult.result.success) {
        this.setData({
          myRanking: rankingResult.result.data.rank || 0
        });
      }

    } catch (error) {
      console.error('获取用户数据失败:', error);
    }
  },

  /**
   * 开始倒计时
   */
  startCountdown() {
    // 检查当前时间并设置倒计时信息
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 清除之前的倒计时定时器
    if (this.data.pkCountdownInterval) {
      clearInterval(this.data.pkCountdownInterval);
    }
    
    // 今天的 19:30
    const todayPkStart = new Date(now);
    todayPkStart.setHours(19, 30, 0, 0);
    
    // 今天的 19:45 (结束时间)
    const todayPkEnd = new Date(now);
    todayPkEnd.setHours(19, 45, 0, 0);
    
    // 明天的 19:30
    const tomorrowPkStart = new Date(now);
    tomorrowPkStart.setDate(now.getDate() + 1);
    tomorrowPkStart.setHours(19, 30, 0, 0);

    let countdownTarget;
    let isActive = false;
    let countdownText = '';

    // 情况1: PK正在进行中 (19:30-19:45)
    if (now >= todayPkStart && now < todayPkEnd) {
      isActive = true;
      countdownTarget = todayPkEnd;
      countdownText = '进行中: ';
    } 
    // 情况2: 今天的PK还没开始，且时间还没到19:30
    else if (now < todayPkStart) {
      countdownTarget = todayPkStart;
      countdownText = '距离开始: ';
    } 
    // 情况3: 今天的PK已结束，倒计时到明天的PK
    else {
      countdownTarget = tomorrowPkStart;
      countdownText = '距离开始: ';
    }

    // 计算初始倒计时
    const initialTimeLeft = countdownTarget - now;
    let hours = Math.floor(initialTimeLeft / (1000 * 60 * 60));
    let minutes = Math.floor((initialTimeLeft % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((initialTimeLeft % (1000 * 60)) / 1000);
    
    // 格式化时间显示
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    this.setData({
      isPkTime: isActive,
      pkCountdownText: countdownText + formattedTime
    });
    
    // 定时更新倒计时
    this.data.pkCountdownInterval = setInterval(() => {
      const currentTime = new Date();
      const timeLeft = countdownTarget - currentTime;
      
      if (timeLeft <= 0) {
        // 倒计时结束，重新启动倒计时逻辑
        clearInterval(this.data.pkCountdownInterval);
        this.startCountdown();
        return;
      }
      
      // 更新倒计时显示
      let hours = Math.floor(timeLeft / (1000 * 60 * 60));
      let minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      this.setData({
        pkCountdownText: countdownText + formattedTime
      });
    }, 1000);
  },

  /**
   * 选择阵营
   */
  selectFaction(e) {
    console.log('selectFaction 被调用');
    const faction = e.currentTarget.dataset.faction;
    console.log('选择的阵营:', faction);

    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    console.log('用户信息:', userInfo);
    if (!userInfo || !userInfo.openid) {
      console.log('用户未登录，显示登录提示');
      wx.showModal({
        title: '需要登录',
        content: '选择阵营需要先登录，是否前往登录页面？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/cloudDwelling/index',
              success: () => {
                console.log('导航成功');
              },
              fail: (err) => {
                console.error('导航失败:', err);
                wx.showToast({
                  title: '跳转失败，请重试',
                  icon: 'none'
                });
              }
            });
          }
        }
      });
      return;
    }

    // 显示确认对话框
    wx.showModal({
      title: '阵营选择确认',
      content: `你确定要加入${faction === 'tower' ? '楼台烟雨中' : '好雨知时节'}阵营吗？选择后将无法更改！`,
      confirmText: '确定加入',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          // 保存用户阵营选择到本地存储
          wx.setStorageSync('userFaction', faction);

          // 保存用户阵营到 xsj_users 集合 - 使用跨环境调用
          var c = new wx.cloud.Cloud({
            identityless: true,
            resourceAppid: 'wx85d92d28575a70f4',
            resourceEnv: 'cloud1-1gsyt78b92c539ef',
          });

          c.init().then(() => {
            return c.callFunction({
              name: 'pkBattle',
              data: {
                action: 'saveUserFaction',
                data: {
                  userFaction: faction
                }
              }
            });
          }).then(saveRes => {
            console.log('保存用户阵营到xsj_users结果:', saveRes);

            // 创建PK参与记录 - 使用跨环境调用
            var c2 = new wx.cloud.Cloud({
              identityless: true,
              resourceAppid: 'wx85d92d28575a70f4',
              resourceEnv: 'cloud1-1gsyt78b92c539ef',
            });

            return c2.init().then(() => {
              return c2.callFunction({
                name: 'pkBattle',
                data: {
                  action: 'joinPkSession',
                  data: {
                    userFaction: faction
                  }
                }
              });
            }).then(res => {
              if (res.result && res.result.success) {
                console.log('成功创建PK参与记录');

                this.setData({
                  userFaction: faction
                });

                wx.showToast({
                  title: `成功加入${faction === 'tower' ? '楼台烟雨中' : '好雨知时节'}`,
                  icon: 'success'
                });

                if (faction === 'tower') {
                  this.setData({
                    towerMemberCount: this.data.towerMemberCount + 1
                  });
                } else {
                  this.setData({
                    rainMemberCount: this.data.rainMemberCount + 1
                  });
                }
              } else {
                console.error('创建PK参与记录失败:', res.result.error);
                wx.showToast({
                  title: '加入阵营失败',
                  icon: 'error'
                });
              }
            }).catch(error => {
              console.error('调用云函数失败:', error);
              wx.showToast({
                title: '网络错误',
                icon: 'error'
              });
            });
          });
        }
      }
    }); // ✅ 这里是你缺失的括号，闭合 wx.showModal
  },


  /**
   * 阵营PK入口点击事件
   */
  async navigateToPK() {
    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      wx.showModal({
        title: '需要登录',
        content: '参与PK大赛需要先登录，是否前往登录页面？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          console.log('PK导航 - 模态框回调:', res);
          if (res.confirm) {
            console.log('PK导航 - 用户确认跳转，开始导航');
            wx.switchTab({
              url: '/pages/cloudDwelling/index',
              success: () => {
                console.log('PK导航 - 导航成功');
              },
              fail: (err) => {
                console.error('PK导航 - 导航失败:', err);
                wx.showToast({
                  title: '跳转失败，请重试',
                  icon: 'none'
                });
              }
            });
          }
        }
      });
      return;
    }

    // 检查用户是否已选择阵营
    if (!this.data.userFaction) {
      wx.showModal({
        title: '选择阵营',
        content: '参与PK大赛需要先选择加入一个阵营',
        confirmText: '去选择',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 导航到选择阵营页面
            wx.navigateTo({
              url: '../factionSelect/index'
            });
          }
        }
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '检查PK状态...',
      mask: true
    });

    try {
      // 获取今天的日期作为questionSetId
      const questionSetId = new Date().toISOString().split('T')[0].replace(/-/g, '');
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
      const statusCheck = await c.callFunction({
        name: 'pkBattle',
        data: {
          action: 'getPkStatus',
          data: {
            questionSetId: questionSetId
          }
        }
      });

      if (statusCheck.result && statusCheck.result.success) {
        const { status } = statusCheck.result.data;

        console.log('读取到的PK状态:', status);

        if (!statusCheck.result.data || status === 'waiting') {
          wx.hideLoading();
          // PK未开始，直接提示
          wx.showModal({
            title: 'PK未开始',
            content: 'PK大赛还未开始，请稍后再试！',
            showCancel: false
          });
          return;
        } else if (status === 'ended') {
          wx.hideLoading();
          // PK已结束，直接提示
          wx.showModal({
            title: 'PK已结束',
            content: 'PK大赛已经结束，请明日再来挑战！',
            showCancel: false
          });
          return;
        }
        // status === 'ongoing' 时允许继续进入
        console.log('PK状态允许进入:', status);
      } else {
        // 如果获取状态失败，也显示未开始提示
        wx.hideLoading();
        wx.showModal({
          title: 'PK未开始',
          content: 'PK大赛还未开始，请稍后再试！',
          showCancel: false
        });
        return;
      }

      // 获取当天日期
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      // 检查用户是否已完成今日PK
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await cloud.init();
      const checkResult = await cloud.callFunction({
        name: 'pkBattle',
        data: {
          action: 'checkUserPkParticipation',
          data: {
            date: dateStr
          }
        }
      });

      wx.hideLoading();

      console.log('PK参与状态检查结果:', checkResult.result);

      if (checkResult.result && checkResult.result.success) {
        const { hasParticipated, isCompleted } = checkResult.result.data;

        if (isCompleted) {
          // 用户已完成今日PK，不能重复参与
          wx.showModal({
            title: '今日已完成',
            content: '您今日已完成PK大赛，请明日再来挑战！',
            confirmText: '知道了',
            showCancel: false
          });
          return;
        }
      }

      // 导航到PK页面
      wx.navigateTo({
        url: '../pkBattle/index'
      });

    } catch (error) {
      console.error('检查PK参与状态失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
    }
  },

  /**
   * 生成模拟数据（实际项目中应从服务器获取）
   */
  generateMockData() {
    // 生成模拟题目
    const mockQuestions = [
      {
        text: '二十四节气中，哪个节气标志着春季的开始？',
        options: ['立春', '雨水', '惊蛰', '春分'],
        correctAnswer: 0
      },
      {
        text: '中国古代城市规划中的"里坊制"最早出现在哪个朝代？',
        options: ['汉朝', '唐朝', '宋朝', '元朝'],
        correctAnswer: 1
      },
      {
        text: '"好雨知时节，当春乃发生"出自谁的诗作？',
        options: ['杜甫', '李白', '白居易', '王维'],
        correctAnswer: 3
      },
      {
        text: '中国古代城市中，皇城一般位于整座城市的什么位置？',
        options: ['东部', '西部', '北部', '中央'],
        correctAnswer: 3
      },
      {
        text: '下列哪个不是中国传统园林的基本要素？',
        options: ['山水', '亭台楼阁', '花木', '霓虹灯'],
        correctAnswer: 3
      }
    ];
    
    this.setData({
      questions: mockQuestions
    });
  },

  /**
   * 加载队伍列表（模拟数据）
   */
  loadTeams(faction, highlightTeamId = '') {
    // 模拟从服务器获取队伍列表
    const mockTeams = [
      {
        id: 't1',
        name: '春风十里队',
        motto: '好雨润万物，春风暖人心',
        memberCount: 3,
        faction: 'tower'
      },
      {
        id: 't2',
        name: '绿荫筑梦队',
        motto: '绿树成荫，筑梦未来',
        memberCount: 2,
        faction: 'tower'
      },
      {
        id: 'r1',
        name: '知时先锋队',
        motto: '知时节，晓时序',
        memberCount: 4,
        faction: 'rain'
      },
      {
        id: 'r2',
        name: '雨露杏林队',
        motto: '春雨如油，润物无声',
        memberCount: 1,
        faction: 'rain'
      }
    ];
    
    // 根据阵营筛选队伍
    const filteredTeams = mockTeams.filter(team => team.faction === faction);
    
    this.setData({
      teams: filteredTeams
    });
    
    // 如果有指定高亮的队伍ID，直接加入该队伍
    if (highlightTeamId) {
      const team = filteredTeams.find(t => t.id === highlightTeamId);
      if (team && team.memberCount < 5) {
        this.joinTeam({ currentTarget: { dataset: { teamId: highlightTeamId } } });
      }
    }
  },

  /**
   * 返回选择阵营页面
   */
  backToHome() {
    this.setData({
      currentState: 'home',
      selectedFaction: '',
      selectedTeam: '',
      trainingFaction: ''
    });
  },

  /**
   * 创建新队伍
   */
  createNewTeam() {
    // 生成随机队伍名和口号
    const teamNames = [
      '春晓先锋队', '云端漫步队', '时雨知春队', '风花雪月队', 
      '竹林探索队', '江南烟雨队', '古城追梦队', '晓风残月队'
    ];
    
    const teamMottos = [
      '春来江水绿如蓝', '好雨知时节', '疏影横斜水清浅', 
      '春风十里不如你', '竹杖芒鞋轻胜马', '小桥流水人家',
      '一花一世界', '云卷云舒日月明'
    ];
    
    // 随机选择名称和口号
    const randomName = teamNames[Math.floor(Math.random() * teamNames.length)];
    const randomMotto = teamMottos[Math.floor(Math.random() * teamMottos.length)];
    
    // 模拟创建队伍并加入
    const newTeam = {
      id: `new-${Date.now()}`,
      name: randomName,
      motto: randomMotto,
      memberCount: 1, // 创建者自己
      faction: this.data.selectedFaction
    };
    
    // 将新队伍添加到列表
    const updatedTeams = [newTeam, ...this.data.teams];
    
    this.setData({
      teams: updatedTeams,
      selectedTeam: newTeam.id
    });
    
    wx.showToast({
      title: '队伍创建成功！',
      icon: 'success'
    });
    
    // 延迟后进入答题页面
    setTimeout(() => {
      this.startQuiz();
    }, 1500);
  },

  /**
   * 加入队伍
   */
  joinTeam(e) {
    const teamId = e.currentTarget.dataset.teamId;
    const team = this.data.teams.find(t => t.id === teamId);
    
    if (team.memberCount >= 5) {
      wx.showToast({
        title: '队伍已满',
        icon: 'error'
      });
      return;
    }
    
    // 更新队伍成员数量
    const updatedTeams = this.data.teams.map(t => {
      if (t.id === teamId) {
        return {...t, memberCount: t.memberCount + 1};
      }
      return t;
    });
    
    this.setData({
      teams: updatedTeams,
      selectedTeam: teamId
    });
    
    wx.showToast({
      title: '加入队伍成功！',
      icon: 'success'
    });
    
    // 延迟后进入答题页面
    setTimeout(() => {
      this.startQuiz();
    }, 1500);
  },

  /**
   * 开始答题
   */
  startQuiz() {
    if (this.data.questions.length === 0) {
      wx.showToast({
        title: '题库为空',
        icon: 'error'
      });
      return;
    }
    
    // 初始化答题状态
    this.setData({
      currentState: 'quiz',
      currentQuestionIndex: 0,
      currentQuestion: this.data.questions[0],
      selectedOption: null,
      timeRemaining: 30,
      teamScores: [
        {
          teamId: this.data.selectedTeam,
          name: this.data.teams.find(t => t.id === this.data.selectedTeam).name,
          score: 0
        },
        {
          teamId: 'opponent',
          name: '对手队伍',
          score: 0
        }
      ]
    });
    
    // 开始计时器
    this.startTimer();
  },

  /**
   * 启动计时器
   */
  startTimer() {
    // 清除旧的计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    
    // 设置新的计时器
    const timerInterval = setInterval(() => {
      if (this.data.timeRemaining <= 1) {
        // 时间到了自动提交
        clearInterval(timerInterval);
        this.submitAnswer();
      } else {
        this.setData({
          timeRemaining: this.data.timeRemaining - 1
        });
      }
    }, 1000);
    
    this.setData({
      timerInterval: timerInterval
    });
  },

  /**
   * 选择答案选项
   */
  selectOption(e) {
    const optionIndex = e.currentTarget.dataset.optionIndex;
    const currentQuestion = this.data.currentQuestion;
    
    if (this.data.questionType === 'multi') {
      // 多选题处理
      let selectedOptions = { ...this.data.selectedOptions };
      
      if (selectedOptions[optionIndex]) {
        // 如果已经选中，则移除
        delete selectedOptions[optionIndex];
      } else {
        // 如果没有选中，则添加
        selectedOptions[optionIndex] = true;
      }
      
      this.setData({
        selectedOptions: selectedOptions
      });
    } else {
      // 单选题处理
      this.setData({
        selectedOption: optionIndex
      });
    }
  },

  /**
   * 处理填空题输入
   */
  onFillAnswerInput(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    let fillAnswers = [...(this.data.fillAnswers || [])];
    // 确保数组长度足够
    while (fillAnswers.length <= index) {
      fillAnswers.push('');
    }
    fillAnswers[index] = e.detail.value;
    
    this.setData({
      fillAnswers
    });
  },

  /**
   * 提交答案
   */
  submitAnswer() {
    const { questionType, currentQuestion, selectedOption, selectedOptions, currentQuestionIndex, currentQuestionList, fillAnswers } = this.data;
    
    let isCorrect = false;
    
    // 根据题目类型判断答案是否正确
    switch(questionType) {
      case 'single':
        isCorrect = selectedOption === currentQuestion.correctAnswer;
        break;
      case 'multi':
        // 多选题判断逻辑
        const selectedIndexes = Object.keys(selectedOptions).map(Number);
        if (selectedIndexes.length === 0) {
          wx.showToast({
            title: '请至少选择一个选项',
            icon: 'none'
          });
          return;
        }
        // 排序后比较，确保顺序无关
        const sortedSelected = [...selectedIndexes].sort();
        const sortedCorrect = [...currentQuestion.correctAnswer].sort();
        isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
        break;
      case 'fill':
        // 填空题判断逻辑
        const emptyAnswers = fillAnswers.filter((answer, index) => {
          // 只检查当前题目实际需要的空格数量
          if (index >= currentQuestion.correctAnswer.length) {
            return false;
          }
          return !answer || !answer.trim();
        });
        
        if (emptyAnswers.length > 0) {
          wx.showToast({
            title: '请填写所有空格',
            icon: 'none'
          });
          return;
        }
        isCorrect = this.checkFillAnswer();
        break;
    }
    
    // 更新答题统计
    let { answeredQuestions, correctAnswers } = this.data;
    answeredQuestions++;
    
    if (isCorrect) {
      correctAnswers++;
    }
    
    // 计算正确率
    const correctRate = Math.round((correctAnswers / answeredQuestions) * 100);
    
    this.setData({
      answeredQuestions,
      correctAnswers,
      correctRate
    });
    
    // 收集用户答案用于显示
    let userAnswer;
    switch(questionType) {
      case 'single':
        userAnswer = selectedOption;
        break;
      case 'multi':
        userAnswer = Object.keys(selectedOptions).map(Number);
        break;
      case 'fill':
        userAnswer = fillAnswers.slice(0, currentQuestion.correctAnswer.length);
        break;
    }
    
    if (isCorrect) {
      // 回答正确，显示成功提示后直接进入下一题
      wx.showToast({
        title: '回答正确',
        icon: 'success',
        duration: 1500
      });
      
      setTimeout(() => {
        this.proceedToNextQuestion();
      }, 1500);
    } else {
      // 回答错误，显示解释弹窗
      this.showExplanationModal(currentQuestion, userAnswer, isCorrect);
    }
  },

  /**
   * 检查多选题答案
   */
  checkMultipleAnswer() {
    // 这里需要根据实际UI实现多选题的检查逻辑
    // 假设多选题的答案存储在currentQuestion.selectedOptions中
    const { currentQuestion } = this.data;
    
    // 示例实现
    if (!currentQuestion.selectedOptions || !currentQuestion.correctAnswers) {
      return false;
    }
    
    // 检查选择的选项是否与正确答案一致
    if (currentQuestion.selectedOptions.length !== currentQuestion.correctAnswers.length) {
      return false;
    }
    
    for (let i = 0; i < currentQuestion.correctAnswers.length; i++) {
      if (!currentQuestion.selectedOptions.includes(currentQuestion.correctAnswers[i])) {
        return false;
      }
    }
    
    return true;
  },
  
  /**
   * 检查填空题答案
   */
  checkFillAnswer() {
    const { currentQuestion, fillAnswers } = this.data;
    
    if (!currentQuestion.correctAnswer) {
      return false;
    }
    
    // 检查每个空的答案是否正确
    return currentQuestion.correctAnswer.every((correctAns, index) => {
      const userAnswer = (fillAnswers[index] || '').trim();
      const correctAnswer = (correctAns || '').trim();
      return userAnswer === correctAnswer;
    });
  },

  /**
   * 显示训练结果
   */
  showTrainingResult() {
    const { trainingType, correctAnswers } = this.data;
    let resultTitle, resultMessage;
    
    // 根据正确率给予不同的评价，但不给奖励
    if (correctAnswers >= 12) { // 15题中答对12题以上
      resultTitle = '训练优秀！';
      resultMessage = `你在${trainingType === 'city' ? '城市' : '时节'}知识方面表现出色！`;
    } else if (correctAnswers >= 8) { // 15题中答对8-11题
      resultTitle = '训练良好！';
      resultMessage = `继续努力提高你的${trainingType === 'city' ? '城市' : '时节'}知识！`;
    } else {
      resultTitle = '需要加强训练';
      resultMessage = `建议多了解${trainingType === 'city' ? '城市' : '时节'}相关知识！`;
    }
    
    // 练习模式不给奖励，只提供学习反馈
    resultMessage += '\n\n练习模式主要用于学习提升，不提供小树奖励。';
    
    // 显示结果弹窗
    this.setData({
      showResult: true,
      resultData: {
        title: resultTitle,
        message: resultMessage,
        scores: [
          { name: '答题总数', score: this.data.totalAllQuestions },
          { name: '正确题数', score: correctAnswers }
        ],
        reward: 0, // 练习模式不给奖励
        isTraining: true
      }
    });
  },

  /**
   * 加入阵营
   */
  joinFaction(e) {
    const faction = e.currentTarget.dataset.faction;
    const factionName = faction === 'tower' ? '楼台烟雨中' : '好雨知时节';
    
    // 根据选择的阵营更新人数
    if (faction === 'tower') {
      this.setData({
        towerMemberCount: this.data.towerMemberCount + 1
      });
    } else {
      this.setData({
        rainMemberCount: this.data.rainMemberCount + 1
      });
    }
    
    // 显示加入成功提示
    wx.showToast({
      title: '加入成功',
      icon: 'success',
      duration: 1500
    });
    
    // 显示加入结果弹窗
    setTimeout(() => {
      this.showJoinResult(faction, factionName);
    }, 1800);
  },
  
  /**
   * 显示加入结果
   */
  showJoinResult(faction, factionName) {
    // 生成随机的小芽奖励
    const reward = Math.floor(Math.random() * 10) + 5;
    
    // 生成一些可能的消息
    const messages = [
      `欢迎加入${factionName}阵营！快去邀请好友一起参与吧！`,
      `恭喜成为${factionName}阵营的一员，一起为阵营争光吧！`,
      `${factionName}阵营因你而更加强大，让我们一起赢得最终胜利！`
    ];
    
    // 随机选择一条消息
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    // 显示结果
    this.setData({
      showResult: true,
      resultData: {
        title: `成功加入${factionName}`,
        message: message,
        scores: [
          { name: '楼台烟雨中', score: this.data.towerMemberCount },
          { name: '好雨知时节', score: this.data.rainMemberCount }
        ],
        reward: reward
      }
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '一队一景・时城争锋 - 知识PK大赛',
      path: '/pages/lanTing/index',
      imageUrl: '/pages/lanTing/pics/楼台烟雨中.jpg'
    };
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    
    // 清除PK倒计时
    if (this.data.pkCountdownInterval) {
      clearInterval(this.data.pkCountdownInterval);
    }
  },

  /**
   * 生成排行榜数据（50个虚拟用户）
   */
  generateLeaderboardData() {
    // 用户名单
    const userNames = [
      '捕梦小川', '桜吹雪', '风', '曦光微漾', 'サクラの舞', '孤舟蓑笠', 
      '被迫营业的Bug', '杜甫很忙', '破晓星星星', '点绛唇', '夜未央', 
      '暗香略浮动', '平行宇宙客服', '寒江独钓', 'dididi', 'π=3.14...', 
      'Dragon', '浮生若梦', '贝塔', '马到成功', '芝士火锅侠', '雪落', 
      '一叶知秋', '林间小鹿·茗', '小雨桐', 'Geheimnis', '啧', 
      '大黄猫与旧钢琴', '邮筒里的诗', '荒岛22图书馆', '月壤种土豆', 
      '蚌埠住了', '有钳人', '谢谢辽', '西楚霸王？', '进击的PPT', '长安', 
      '旧笺', '凌晨三四五六点', '青柠薄荷糖', '极光便利店', '笑笑蒜了', 
      '佛系卷王', '浣熊冬不拉', '听雪煎茶人', '公主小美', '嘿朋友', 
      '明月何时有', '前浪之之', '故乡2002'
    ];

    // 创建用户数据并添加随机分数和阵营
    const leaderboardData = userNames.map((name, index) => {
      // 基础分数在800-1000之间，前几名有更高的分数
      let baseScore = 800 + Math.floor(Math.random() * 200);
      
      // 前10名有更高的分数
      if (index < 10) {
        baseScore += 100 + (10 - index) * 15;
      }
      
      // 随机分配阵营
      const faction = Math.random() > 0.5 ? 'tower' : 'rain';
      
      return {
        name,
        score: baseScore,
        faction,
        correctRate: Math.floor(70 + Math.random() * 30) // 正确率70%-100%
      };
    });
    
    // 按分数排序
    leaderboardData.sort((a, b) => b.score - a.score);
    
    this.setData({
      leaderboardUsers: leaderboardData
    });
    
    // 确保排行榜已更新，打印前三名用户数据以进行调试
    console.log("排行榜前三名：", leaderboardData.slice(0, 3));
  },

  /**
   * 开始训练
   */
  startTraining(e) {
    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      wx.showModal({
        title: '需要登录',
        content: '参与训练需要先登录，是否前往登录页面？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          console.log('训练导航 - 模态框回调:', res);
          if (res.confirm) {
            console.log('训练导航 - 用户确认跳转，开始导航');
            wx.switchTab({
              url: '/pages/cloudDwelling/index',
              success: () => {
                console.log('训练导航 - 导航成功');
              },
              fail: (err) => {
                console.error('训练导航 - 导航失败:', err);
                wx.showToast({
                  title: '跳转失败，请重试',
                  icon: 'none'
                });
              }
            });
          }
        }
      });
      return;
    }

    const faction = e.currentTarget.dataset.faction;
    const trainingType = faction === 'tower' ? 'city' : 'season';
    
    // 更新训练类型和阵营
    this.setData({
      trainingFaction: faction,
      currentState: 'training',
      trainingType: trainingType,
      questionType: 'single', // 默认从单选题开始
      answeredQuestions: 0,
      correctAnswers: 0,
      correctRate: 0
    });
    
    // 获取训练题目 - API预留
    this.loadTrainingQuestions(trainingType);
  },

  /**
   * 从云数据库加载训练题目
   */
  loadTrainingQuestions(trainingType) {
    // 显示加载中
    wx.showLoading({
      title: '加载题目中...'
    });
    
    // 调用云函数获取训练题目
    // 创建跨环境调用的Cloud实例
    var c = new wx.cloud.Cloud({
      // 必填，表示是未登录模式
      identityless: true,
      // 资源方 AppID
      resourceAppid: 'wx85d92d28575a70f4',
      // 资源方环境 ID
      resourceEnv: 'cloud1-1gsyt78b92c539ef'
    });
    c.init().then(() => {
      return c.callFunction({
      name: 'pkBattle',  // 使用pkBattle云函数
      data: {
        action: 'getQuestions',
        data: {
          isTraining: true,  // 表明是训练模式
          category: trainingType // 'city'或'season'
        }
      }
    }).then(res => {
      if (res.result && res.result.success) {
        console.log(`成功获取${trainingType}训练题目:`, res.result);
        
        // 处理题目数据，将数据库格式转换为前端需要的格式
        const processQuestions = (questions) => {
          if (!Array.isArray(questions)) {
            console.warn('题目数据不是数组:', questions);
            return [];
          }
          return questions.map(q => {
            // 转换题目类型
            let questionType;
            switch(q.type) {
              case "1":
                questionType = 'single';
                break;
              case "2":
                questionType = 'multiple';
                break;
              case "3":
                questionType = 'fill';
                break;
              default:
                questionType = q.type;
            }

            // 处理答案格式
            let correctAnswer;
            if (Array.isArray(q.correctAnswer)) {
              if (questionType === 'single') {
                // 单选题答案转换为索引
                correctAnswer = this.data.optionLetters.indexOf(q.correctAnswer[0]);
              } else if (questionType === 'multiple') {
                // 多选题答案转换为索引数组
                correctAnswer = q.correctAnswer.map(ans => this.data.optionLetters.indexOf(ans));
              } else {
                // 填空题直接使用答案
                correctAnswer = q.correctAnswer;
              }
            } else {
              correctAnswer = q.correctAnswer;
            }

            return {
              ...q,
              id: q._id || q.id,
              text: q.content, // 使用content字段
              type: questionType,
              category: q.category,
              correctAnswer: correctAnswer
            };
          });
        };

        // 获取分类后的题目数据
        const { single, multiple, fill } = res.result.data;
        
        // 计算所有题目的总数
        const totalAll = (single?.length || 0) + (multiple?.length || 0) + (fill?.length || 0);
        
        console.log('分类后的题目数据:', {
          single,
          multiple,
          fill,
          totalAll
        });
        
        this.setData({
          singleQuestions: processQuestions(single || []),
          multipleQuestions: processQuestions(multiple || []),
          fillQuestions: processQuestions(fill || []),
          currentCategory: trainingType,
          totalQuestions: single?.length || 0, // 当前类型的题目数
          totalAllQuestions: totalAll // 所有题目的总数
        });
        
        console.log('处理后的题目数据:', {
          single: this.data.singleQuestions,
          multiple: this.data.multipleQuestions,
          fill: this.data.fillQuestions
        });
        
        // 设置当前题目类型和题目列表
        this.switchQuestionType('single');
        
        // 处理填空题答案初始化
        if (this.data.questionType === 'fill' && this.data.currentQuestion) {
          const blankCount = this.data.currentQuestion.content.split('___').length - 1;
          const fillAnswers = new Array(blankCount).fill('');
          this.setData({ fillAnswers });
        }
        
        wx.hideLoading();
      } else {
        console.error('获取训练题目失败:', res.result?.error || '未知错误');
        wx.hideLoading();
        wx.showToast({
          title: '获取题目失败，使用备用题库',
          icon: 'none',
          duration: 2000
        });
        
        // 失败时使用本地备用题库
        this.generateMockTrainingQuestions(trainingType);
      }
    }).catch(error => {
      console.error('训练题目云函数调用失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '网络错误，使用备用题库',
        icon: 'none',
        duration: 2000
      });
      
      // 网络错误时使用本地备用题库
      this.generateMockTrainingQuestions(trainingType);
    });
    }).catch(error => {
      console.error('云环境初始化失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '初始化失败，使用备用题库',
        icon: 'none',
        duration: 2000
      });
      
      // 初始化失败时使用本地备用题库
      this.generateMockTrainingQuestions(trainingType);
    });
  },
  
  /**
   * 生成模拟训练题目（测试用）
   */
  generateMockTrainingQuestions(category) {
    // 模拟单选题
    const singleQuestions = [
      {
        id: 's1',
        content: '二十四节气中，哪个节气标志着春季的开始？',
        options: ['立春', '雨水', '惊蛰', '春分'],
        correctAnswer: 0
      },
      {
        id: 's2',
        content: '中国古代城市规划中的"里坊制"最早出现在哪个朝代？',
        options: ['汉朝', '唐朝', '宋朝', '元朝'],
        correctAnswer: 1
      },
      {
        id: 's3',
        content: '"好雨知时节，当春乃发生"出自谁的诗作？',
        options: ['杜甫', '李白', '白居易', '王维'],
        correctAnswer: 3
      },
      {
        id: 's4',
        content: '中国古代城市中，皇城一般位于整座城市的什么位置？',
        options: ['东部', '西部', '北部', '中央'],
        correctAnswer: 3
      },
      {
        id: 's5',
        content: '下列哪个不是中国传统园林的基本要素？',
        options: ['山水', '亭台楼阁', '花木', '霓虹灯'],
        correctAnswer: 3
      }
    ];
    
    // 模拟多选题
    const multipleQuestions = [];
    for (let i = 1; i <= 5; i++) {
      multipleQuestions.push({
        id: `multi_${i}`,
        type: 'multiple',
        category: category,
        text: category === 'city' ? 
          `城市知识多选题${i}：以下哪些城市是中国的直辖市？` : 
          `时节知识多选题${i}：以下哪些节气属于夏季？`,
        options: category === 'city' ? 
          ['北京', '上海', '广州', '重庆'] : 
          ['立夏', '小满', '秋分', '冬至'],
        correctAnswer: category === 'city' ? 'ABD' : 'AB'
      });
    }
    
    // 模拟填空题
    const fillQuestions = [];
    for (let i = 1; i <= 5; i++) {
      fillQuestions.push({
        id: `fill_${i}`,
        type: 'fill',
        category: category,
        text: category === 'city' ? 
          `城市知识填空题${i}：中国最大的城市是___。` : 
          `时节知识填空题${i}："小暑大暑，上蒸下煮"描述的是___季节。`,
        correctAnswer: category === 'city' ? ['上海'] : ['夏季']
      });
    }
    
    this.setData({
      singleQuestions: singleQuestions,
      multipleQuestions: multipleQuestions,
      fillQuestions: fillQuestions,
      currentCategory: category
    });
    
    // 设置当前题目类型和题目列表
    this.switchQuestionType('single');
  },
  
  /**
   * 切换题目类型
   */
  switchQuestionType(type) {
    let currentQuestionList = [];
    switch(type) {
      case 'single':
        currentQuestionList = this.data.singleQuestions;
        break;
      case 'multi':
        currentQuestionList = this.data.multipleQuestions;
        break;
      case 'fill':
        currentQuestionList = this.data.fillQuestions;
        break;
    }
    
    if (currentQuestionList.length > 0) {
      this.setData({
        questionType: type,
        currentQuestionList: currentQuestionList,
        currentQuestionIndex: 0,
        currentQuestion: currentQuestionList[0],
        selectedOption: null,
        selectedOptions: {}, // 重置多选选项为空对象
        totalQuestions: currentQuestionList.length // 设置当前类型的总题目数
      });
    } else {
      // 当前类型没有题目，尝试跳转到下一类型
      console.log(`${type}类型没有题目，尝试跳转到下一类型`);
      this.skipToNextTypeOrEnd(type);
    }
  },

  /**
   * 跳过当前类型到下一类型或结束训练
   */
  skipToNextTypeOrEnd(currentType) {
    let nextType = '';
    
    switch(currentType) {
      case 'single':
        nextType = 'multi';
        break;
      case 'multi':
        nextType = 'fill';
        break;
      case 'fill':
        // 所有类型都没有题目，结束训练
        wx.showToast({
          title: '没有可用的题目',
          icon: 'none',
          duration: 2000
        });
        setTimeout(() => {
          this.showTrainingResult();
        }, 2000);
        return;
    }
    
    // 检查下一类型是否有题目
    let nextQuestionList = [];
    switch(nextType) {
      case 'multi':
        nextQuestionList = this.data.multipleQuestions;
        break;
      case 'fill':
        nextQuestionList = this.data.fillQuestions;
        break;
    }
    
    if (nextQuestionList.length > 0) {
      // 下一类型有题目，切换过去
      wx.showToast({
        title: `${currentType === 'single' ? '单选题' : '多选题'}没有题目，跳转到${nextType === 'multi' ? '多选题' : '填空题'}`,
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        this.switchQuestionType(nextType);
      }, 2000);
    } else {
      // 下一类型也没有题目，继续递归检查
      this.skipToNextTypeOrEnd(nextType);
    }
  },
  
  /**
   * 完成当前类型的训练，进入下一类型
   */
  completeCurrentTypeTraining() {
    const currentType = this.data.questionType;
    let nextType = '';
    
    switch(currentType) {
      case 'single':
        nextType = 'multi';
        break;
      case 'multi':
        nextType = 'fill';
        break;
      case 'fill':
        // 所有类型都完成了
        this.showTrainingResult();
        return;
    }
    
    // 检查下一类型是否有题目
    let nextQuestionList = [];
    switch(nextType) {
      case 'multi':
        nextQuestionList = this.data.multipleQuestions;
        break;
      case 'fill':
        nextQuestionList = this.data.fillQuestions;
        break;
    }
    
    if (nextQuestionList.length > 0) {
      // 下一类型有题目，正常切换
      wx.showToast({
        title: `进入${nextType === 'multi' ? '多选题' : '填空题'}`,
        icon: 'none'
      });
      
      // 切换到下一个题目类型
      this.switchQuestionType(nextType);
    } else {
      // 下一类型没有题目，跳过或结束
      this.skipToNextTypeOrEnd(nextType);
    }
  },

  /**
   * 关闭结果弹窗
   */
  closeResult() {
    this.setData({
      showResult: false
    });
    
    // 如果当前是训练状态，关闭弹窗后返回主页
    if (this.data.currentState === 'training') {
      this.backToHome();
    }
  },

  /**
   * 显示答案解释弹窗
   */
  showExplanationModal(questionData, userAnswer, isCorrect) {
    const { currentQuestion, questionType, optionLetters } = this.data;
    
    // 格式化正确答案显示
    let correctAnswerText = '';
    let userAnswerText = '';
    
    switch(questionType) {
      case 'single':
        correctAnswerText = optionLetters[currentQuestion.correctAnswer] || '未知';
        userAnswerText = optionLetters[userAnswer] || '未选择';
        break;
      case 'multi':
        const correctOptions = currentQuestion.correctAnswer.map(index => optionLetters[index]).join('、');
        const userOptions = userAnswer.map(index => optionLetters[index]).join('、');
        correctAnswerText = correctOptions || '未知';
        userAnswerText = userOptions || '未选择';
        break;
      case 'fill':
        correctAnswerText = Array.isArray(currentQuestion.correctAnswer) 
          ? currentQuestion.correctAnswer.join('、') 
          : currentQuestion.correctAnswer;
        userAnswerText = Array.isArray(userAnswer) 
          ? userAnswer.join('、') 
          : userAnswer;
        break;
    }
    
    this.setData({
      showExplanationModal: true,
      explanationData: {
        title: isCorrect ? '回答正确！' : '回答错误',
        content: currentQuestion.explanation || '暂无解释',
        correctAnswer: correctAnswerText,
        userAnswer: userAnswerText
      }
    });
  },

  /**
   * 关闭解释弹窗
   */
  closeExplanationModal() {
    this.setData({
      showExplanationModal: false
    });
  },

  /**
   * 确认解释弹窗，进入下一题
   */
  confirmExplanation() {
    this.closeExplanationModal();
    this.proceedToNextQuestion();
  },

  /**
   * 进入下一题的逻辑
   */
  proceedToNextQuestion() {
    const { currentQuestionIndex, currentQuestionList } = this.data;
    
    // 判断是否答完当前类型的所有题目
    if (currentQuestionIndex >= currentQuestionList.length - 1) {
      // 当前类型训练结束，进入下一类型
      this.completeCurrentTypeTraining();
    } else {
      // 进入当前类型的下一题
      const nextQuestion = currentQuestionList[currentQuestionIndex + 1];
      const newFillAnswers = nextQuestion && nextQuestion.correctAnswer && Array.isArray(nextQuestion.correctAnswer) 
        ? new Array(nextQuestion.correctAnswer.length).fill('')
        : [];
        
      this.setData({
        currentQuestionIndex: currentQuestionIndex + 1,
        currentQuestion: nextQuestion,
        selectedOption: null,
        selectedOptions: {}, // 重置多选选项为空对象
        fillAnswers: newFillAnswers // 重置填空题答案为新的空数组
      });
    }
  },

  /**
   * 获取排行榜数据
   */
  getLeaderboardData: function() {
    wx.showLoading({
      title: '获取排行榜中...',
    });
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // 使用云函数获取排行榜数据 - 使用跨环境调用
    // 创建跨环境调用的Cloud实例
    var c = new wx.cloud.Cloud({ 
      // 必填，表示是未登录模式 
      identityless: true, 
      // 资源方 AppID 
      resourceAppid: 'wx85d92d28575a70f4', 
      // 资源方环境 ID 
      resourceEnv: 'cloud1-1gsyt78b92c539ef', 
    }) 
    c.init().then(() => {
      return c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getLeaderboard',
          data: {
            date: dateStr,
            yesterday: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        }
      });
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        console.log('成功获取排行榜数据:', res.result);
        
        // 更新排行榜数据
        this.setData({
          leaderboardUsers: res.result.data.users || [],
          dailyWinner: res.result.data.dailyWinner || this.data.dailyWinner,
          towerMemberCount: res.result.data.factionCounts?.tower || this.data.towerMemberCount,
          rainMemberCount: res.result.data.factionCounts?.rain || this.data.rainMemberCount
        });
      } else {
        console.error('获取排行榜数据失败:', res.result?.message || '未知错误');
        // 使用本地生成的排行榜数据
        this.generateLeaderboardData();
      }
    }).catch(error => {
      wx.hideLoading();
      console.error('获取排行榜云函数调用失败:', error);
      // 使用本地生成的排行榜数据
      this.generateLeaderboardData();
    });
  },

  /**
   * 更新用户树苗数量
   * @param {number} earnedTrees 新获得的树苗数量
   */
  updateUserTrees: async function(earnedTrees) {
    if (earnedTrees <= 0) return;

    try {
      const app = getApp();
      // 获取当前树苗数量
      const currentLantingTrees = (app.globalData && app.globalData.lantingTrees) || 0;
      const newLantingTrees = currentLantingTrees + earnedTrees;

      if (app.globalData) {
        // 更新兰亭树苗数量
        app.globalData.lantingTrees = newLantingTrees;
        // 更新总树木数量
        const timeSequenceTrees = app.globalData.timeSequenceTrees || 0;
        const consumedTrees = app.globalData.consumedTrees || 0;
        app.globalData.treeCount = newLantingTrees + timeSequenceTrees - consumedTrees;
      }

      // 更新本地存储
      wx.setStorageSync('lantingTrees', newLantingTrees);
      wx.setStorageSync('treeCount', app.globalData.treeCount);

      // 更新云数据库中的用户树木数量
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({
        // 必填，表示是未登录模式
        identityless: true,
        // 资源方 AppID
        resourceAppid: 'wx85d92d28575a70f4',
        // 资源方环境 ID
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await c.init();
      const result = await c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'updateUserInfo',
          data: {
            lantingTrees: newLantingTrees,
            treeCount: app.globalData.treeCount
          }
        }
      });

      if (!result.result.success) {
        throw new Error('更新云数据库树木数量失败');
      }

      // 更新页面显示
      this.setData({
        lantingTrees: newLantingTrees,
        treeCount: app.globalData.treeCount
      });

      // 显示获得树苗的提示
      wx.showToast({
        title: `获得${earnedTrees}棵树苗`,
        icon: 'success',
        duration: 2000
      });

    } catch (error) {
      console.error('更新树苗数量失败:', error);
      wx.showToast({
        title: '更新树苗数量失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 处理排行榜奖励
   * @param {number} rank 用户排名
   * @returns {number} 奖励的树苗数量
   */
  handleRankingReward: function(rank) {
    let rewardTrees = 0;
    // 根据排名确定奖励树苗数量
    switch(rank) {
      case 1:
        rewardTrees = 3;
        break;
      case 2:
        rewardTrees = 2;
        break;
      case 3:
        rewardTrees = 1;
        break;
      default:
        rewardTrees = 0;
    }
    return rewardTrees;
  },

  /**
   * 发放排行榜奖励
   */
  distributeRankingRewards: async function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      console.log('用户未登录，无法发放奖励');
      return;
    }

    try {
      // 获取用户排名 - 使用跨环境调用
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
      const rankingResult = await c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getUserRanking'
        }
      });

      if (rankingResult.result && rankingResult.result.success) {
        const userRank = rankingResult.result.data.rank;
        const rewardTrees = this.handleRankingReward(userRank);
        
        if (rewardTrees > 0) {
          // 更新用户树苗数量
          await this.updateUserTrees(rewardTrees);
        }
      }
    } catch (error) {
      console.error('发放排行榜奖励失败:', error);
    }
  },

  /**
   * 获取排行榜数据
   */
  async fetchRankingData() {
    try {
      console.log('开始获取排行榜数据...');
      
      // 1. 获取获胜阵营数据
      // 获取中国时区的昨天日期
      const chinaDate = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
      const yesterday = new Date(chinaDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      
      console.log('查询日期:', yesterdayStr);

      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({
        // 必填，表示是未登录模式
        identityless: true,
        // 资源方 AppID
        resourceAppid: 'wx85d92d28575a70f4',
        // 资源方环境 ID
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await c.init();
      const pkResult = await c.callFunction({
        name: 'getPkResults',
        data: {
          questionSetId: yesterdayStr
        }
      });

      console.log('获胜阵营数据:', pkResult.result);

      // 如果成功获取到获胜阵营数据，更新页面
      if (pkResult.result && pkResult.result.success) {
        const pkData = pkResult.result.data;
        this.setData({
          winnerFaction: pkData.winnerFaction === 'tower' ? '楼台烟雨中' : '好雨知时节'
        });
      }

      // 2. 获取用户排行榜数据（保持原有逻辑不变）
      const { result } = await c.callFunction({
        name: 'pkBattle',
        data: {
          action: 'getPkRanking'
        }
      });

      console.log('排行榜数据返回:', result);

      if (result && result.success && result.data) {
        const { topThree } = result.data;
        
        // 检查数据是否存在
        if (!topThree || !Array.isArray(topThree)) {
          console.error('排行榜数据格式错误:', result.data);
          return;
        }

        // 使用当前小时作为随机种子
        const now = new Date();
        const currentHour = now.getHours();
        
        // 简单的伪随机数生成函数
        const seededRandom = (seed, index) => {
          const x = Math.sin(seed + index) * 10000;
          return Math.abs(x - Math.floor(x));
        };

        // 模拟用户数据
        const mockUsers = [
          { name: '墨香书生', faction: 'tower' },
          { name: '竹影清风', faction: 'rain' },
          { name: '江南故人', faction: 'tower' },
          { name: '山水逸客', faction: 'rain' },
          { name: '云端漫步', faction: 'tower' },
          { name: '明月清风', faction: 'rain' },
          { name: '诗画江南', faction: 'tower' },
          { name: '一叶知秋', faction: 'rain' },
          { name: '梅雨江南', faction: 'tower' },
          { name: '烟雨楼台', faction: 'rain' }
        ];

        // 为模拟用户生成基于时间的固定分数
        const mockData = mockUsers.map((user, index) => ({
          ...user,
          // 使用小时数和用户索引生成固定的随机分数
          score: Math.floor(seededRandom(currentHour, index) * 11) + 10 // 10-20之间的分数
        }));

        // 确保真实数据中的用户名字段统一
        const normalizedTopThree = topThree.map(user => ({
          ...user,
          name: user.name || user.username || '匿名用户'
        }));

        // 合并真实数据和模拟数据
        const combinedTopThree = [...normalizedTopThree];
        mockData.forEach(mock => {
          if (!combinedTopThree.some(user => user.name === mock.name)) {
            combinedTopThree.push(mock);
          }
        });

        // 按分数排序并只保留前三名
        const finalTopThree = combinedTopThree.sort((a, b) => b.score - a.score).slice(0, 3);

        // 只更新用户排行榜数据
        this.setData({
          topThree: finalTopThree
        });
      }
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
    }
  }
});








