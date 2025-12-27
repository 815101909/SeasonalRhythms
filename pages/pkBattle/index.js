// 阵营PK对战页面
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面状态：'waiting'(等待), 'question'(答题), 'result'(结果)
    currentState: 'waiting',
    
    // 阵营数据
    towerCount: 0, // 楼台阵营人数
    rainCount: 0, // 好雨阵营人数
    towerScore: 0,
    rainScore: 0,
    
    // 多人PK会话相关
    sessionId: '',
    questionSetId: '',
    pkStatus: 'waiting', // waiting, ongoing, ended
    
    // 用户数据
    userFaction: '', // 'tower' 或 'rain'
    
    // 问题相关
    currentQuestionIndex: 0,
    totalQuestions: 15, // 5单选+5多选+5填空
    currentQuestion: null,
    currentQuestionType: 'single', // 当前题目类型
    questions: {
      single: [], // 单选题
      multiple: [], // 多选题
      fill: [] // 填空题
    },
    optionLetters: ['A', 'B', 'C', 'D', 'E', 'F'],
    selectedOption: null, // 选中的单选题选项索引，初始为null
    selectedOptions: {}, // 选中的多选题选项索引对象，初始为空对象
    fillAnswers: [], // 填空题答案数组
    
    // UI相关
    showTimer: false,
    timeRemaining: 30,
    statusText: '等待PK开始...',
    canSubmit: false,
    showAnswers: false, // 是否显示参考答案
    isPkTime: false, // 是否是PK时间
    
    // 用户答题统计
    answeredQuestions: 0,
    correctAnswers: 0,
    
    // 结果相关
    winnerFaction: 'tower',
    topPerformers: [],
    totalAnswers: 0,
    avgCorrectRate: 0,
    userRanking: 0, // 用户排名
    userScore: 0, // 用户得分
    userReward: 0, // 用户奖励
    
    // 抢答状态
    isAnswered: false, // 当前题目是否已被抢答
    firstAnswerFaction: '', // 第一个回答的阵营
    
    // 虚拟用户名单（50个用户）
    virtualUsers: [
      '春风归人', '雨巷漫步', '白鹭青洲', '墨池飞雪', '青衫故人',
      '烟雨江南', '雁南飞', '竹影清风', '云水禅心', '山间明月',
      '华灯初上', '烟波浩渺', '古道西风', '星辰大海', '风雨同舟',
      '花开半夏', '清风徐来', '木叶之秋', '湖光山色', '冬雪初霁',
      '梅花三弄', '杏花微雨', '兰亭序', '诗魂墨韵', '桃花扇',
      '渔樵问答', '闲云野鹤', '竹林七贤', '松风琴韵', '岁月如歌',
      '溪山行旅', '林泉高致', '江畔独步', '枫桥夜泊', '雨打芭蕉',
      '青山隐隐', '水墨丹青', '长亭外', '故园风雨', '烟雨楼台',
      '小桥流水', '落花流水', '飞花令', '红袖添香', '绿竹青青',
      '昭华旧事', '锦瑟年华', '流年似水', '梧桐细雨', '山水清音'
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    // 设置初始状态为loading
    this.setData({
      currentState: 'loading',
      statusText: '加载中...'
    });
    
    // 智能获取用户阵营信息：优先使用有效缓存，否则从数据库获取
    let userFaction = '';
    
    // 检查缓存是否有效（缓存时间小于30分钟）
    const cachedFaction = wx.getStorageSync('userFaction');
    const cacheTime = wx.getStorageSync('userFactionCacheTime');
    const now = Date.now();
    const cacheValidDuration = 30 * 60 * 1000; // 30分钟
    
    if (cachedFaction && cacheTime && (now - cacheTime < cacheValidDuration)) {
      // 使用有效的缓存
      userFaction = cachedFaction;
      console.log('使用缓存的用户阵营:', userFaction);
    } else {
      // 缓存无效或不存在，从数据库获取
      console.log('缓存无效，从数据库获取阵营信息');
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
          name: 'xsj_auth',
          data: {
            action: 'getUserInfo'
          }
        });

        if (result.result && result.result.success && result.result.data.faction) {
          userFaction = result.result.data.faction;
          console.log('从数据库获取到用户阵营:', userFaction);
          // 更新缓存
          wx.setStorageSync('userFaction', userFaction);
          wx.setStorageSync('userFactionCacheTime', Date.now());
        } else {
          console.log('数据库中没有用户阵营信息');
          // 清除无效缓存
          wx.removeStorageSync('userFaction');
          wx.removeStorageSync('userFactionCacheTime');
        }
      } catch (error) {
        console.error('获取用户阵营信息失败:', error);
        // 如果网络错误且有缓存，使用过期缓存作为备选
        if (cachedFaction) {
          userFaction = cachedFaction;
          console.log('网络错误，使用过期缓存:', userFaction);
        }
      }
    }
    
    if (!userFaction) {
      // 如果用户未选择阵营，返回到选择页面
      wx.showModal({
        title: '未选择阵营',
        content: '你需要先选择一个阵营才能参与PK大赛。注意：阵营一旦选择将无法更改！',
        showCancel: false,
        success: (res) => {
          wx.navigateBack();
        }
      });
      return;
    }
    
    // 确保初始化时selectedOptions为空数组
    this.setData({
      userFaction: userFaction,
      totalQuestions: 15, // 确保总题数为15
      selectedOption: null,  // 明确初始化为null
      selectedOptions: {},  // 明确初始化为空对象
      userScore: 0  // 初始化分数为0
    });
    
    // 检查用户是否已经完成今天的PK
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
      // 获取今天的日期（中国时区）
      const today = new Date();
      const chinaTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
      const dateStr = chinaTime.toISOString().split('T')[0];
      
      const pkStatusResult = await c2.callFunction({
        name: 'pkBattle',
        data: {
          action: 'checkUserPkParticipation',
          data: {
            date: dateStr
          }
        }
      });

      if (pkStatusResult.result && pkStatusResult.result.success && pkStatusResult.result.data.isCompleted) {
        // 用户已完成PK，直接显示结果页面
        console.log('用户已完成今日PK，直接显示结果页面');
        
        // 设置用户数据
        const userData = pkStatusResult.result.data;
        const userScore = userData.score || 0;
        const totalReward = userScore; // 每分得1颗树
        
        console.log('已完成PK用户数据:', userData);
        console.log('用户分数:', userScore, '奖励:', totalReward);
        
        this.setData({
          userFaction: userData.userFaction || userFaction,
          userScore: userScore,
          correctAnswers: userData.correctAnswers || 0,
          answeredQuestions: userData.totalAnswers || 0,
          userReward: totalReward, // 设置奖励
          currentState: 'result'
        });
        
        // 加载排行榜数据和阵营数据
        this.loadRealRankingData();
        this.loadFactionData(); // 添加获取阵营数据
        return;
      }
    } catch (error) {
      console.error('检查PK状态失败:', error);
    }

    // 连接多人PK会话
    this.joinPkSession();

    // 拉取题目数据
    this.fetchQuestions();

    // 开始监听PK状态变化
    this.startPkStatusListener();
  },

  /**
   * 加入PK会话
   */
  joinPkSession() {
    console.log('加入PK会话...');

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
        name: 'pkBattle',
        data: {
          action: 'joinPkSession',
          data: {
            userFaction: this.data.userFaction
          }
        }
      });
    }).then(res => {
      console.log('joinPkSession完整响应:', res);
      if (res.result && res.result.success) {
        console.log('成功加入PK会话:', res.result.data);

        // 确保 factions 数组存在且有足够的元素
        const factions = res.result.data.factions || [
          { name: 'tower', userCount: 0, correctCount: 0, totalScore: 0 },
          { name: 'rain', userCount: 0, correctCount: 0, totalScore: 0 }
        ];

        console.log('阵营数据:', factions);

        this.setData({
          sessionId: res.result.data.sessionId,
          questionSetId: res.result.data.questionSetId,
          pkStatus: res.result.data.status,
          towerCount: factions[0] ? factions[0].userCount : 0,
          rainCount: factions[1] ? factions[1].userCount : 0,
          towerScore: factions[0] ? factions[0].totalScore : 0,
          rainScore: factions[1] ? factions[1].totalScore : 0
        });

      } else {
        console.error('加入PK会话失败:', res.result);
        wx.showToast({
          title: '连接PK失败',
          icon: 'error'
        });
      }
    }).catch(err => {
      console.error('加入PK会话出错:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
    });
  },

  /**
   * 开始监听PK状态变化
   */
  startPkStatusListener() {
    // 每5秒检查一次PK状态
    this.pkStatusTimer = setInterval(() => {
      this.checkPkStatusUpdate();
    }, 5000);
  },

  /**
   * 检查PK状态更新
   */
  checkPkStatusUpdate() {
    if (!this.data.questionSetId) return;

    // 直接获取最新的PK数据，不更新状态
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
        name: 'pkBattle',
        data: {
          action: 'getPkStatus',
          data: {
            questionSetId: this.data.questionSetId
          }
        }
      });
    }).then(res => {
      if (res && res.result && res.result.success) {
        const statusData = res.result.data;

        // 确保 factions 数组存在且有足够的元素
        const factions = statusData.factions || [
          { name: 'tower', userCount: 0, correctCount: 0, totalScore: 0 },
          { name: 'rain', userCount: 0, correctCount: 0, totalScore: 0 }
        ];

        // 更新阵营数据
        this.setData({
          pkStatus: statusData.status,
          towerCount: factions[0] ? factions[0].userCount : 0,
          rainCount: factions[1] ? factions[1].userCount : 0,
          towerScore: factions[0] ? factions[0].totalScore : 0,
          rainScore: factions[1] ? factions[1].totalScore : 0
        });

        // 根据PK状态更新页面状态
        if (statusData.status === 'ongoing') {
          // PK进行中，如果当前不在答题状态，则开始答题
          if (this.data.currentState === 'waiting' || this.data.currentState === 'loading') {
            this.setData({
              currentState: 'question'
            });
          }
        } else if (statusData.status === 'waiting') {
          // 未开始，保持等待提示
          if (this.data.currentState !== 'waiting') {
            this.setData({ currentState: 'waiting', statusText: 'PK未开始，仅周末19:30-19:45开放' });
          }
        } else if (statusData.status === 'ended') {
          if (this.data.currentState !== 'result') {
            this.showFinalResults();
          }
        }

      }
    }).catch(err => {
      console.error('检查PK状态失败:', err);
    });
  },
  
  /**
   * 拉取题目数据
   */
  fetchQuestions() {
    // 显示加载中
    wx.showLoading({
      title: '获取PK题目中...',
    });
    
    // 获取当前时间戳
    const today = new Date();
    const dateStr = today.getTime().toString();
    
    // 调用云函数获取题目
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
        name: 'pkBattle',
        data: {
          action: 'getQuestions',
          data: {
            date: dateStr,
            userFaction: this.data.userFaction
          }
        }
      });
    }).then(res => {
      if (res.result && res.result.success) {
        console.log('成功获取PK题目:', res.result);
        
        // 处理题目数据，将A/B/C/D转换为数组索引
        const processQuestions = (questions) => {
          if (!Array.isArray(questions)) {
            console.error('题目数据不是数组:', questions);
            return [];
          }
          return questions.map(q => ({
            ...q,
            // 保持原始答案格式（字母形式）
            correctAnswer: q.correctAnswer
          }));
        };
        
        // 按题目类型分类并处理
        const questions = res.result.data;
        if (!questions || typeof questions !== 'object') {
          throw new Error('题目数据格式错误');
        }

        const single = Array.isArray(questions.single) ? questions.single : [];
        const multiple = Array.isArray(questions.multiple) ? questions.multiple : [];
        const fill = Array.isArray(questions.fill) ? questions.fill : [];
        
        this.setData({
          'questions.single': processQuestions(single),
          'questions.multiple': processQuestions(multiple),
          'questions.fill': fill,
          totalQuestions: single.length + multiple.length + fill.length
        });
        
        // 启动PK
        this.startPK();
        wx.hideLoading();
      } else {
        throw new Error(res.result.error || '获取题目失败');
      }
    }).catch(err => {
      console.error('获取PK题目失败:', err);
      wx.hideLoading();
      wx.showModal({
        title: '获取题目失败',
        content: err.message || '请稍后重试',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    });
  },
  
  /**
   * 使用备用题库（当API请求失败时）
   */
  useMockQuestions() {
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
    const multipleQuestions = [
      {
        id: 'm1',
        content: '下列哪些节气属于春季？（多选）',
        options: ['立春', '小满', '清明', '谷雨', '小雪'],
        correctAnswers: [0, 2, 3]
      },
      {
        id: 'm2',
        content: '中国古代城市中，下列哪些是著名的皇家园林？（多选）',
        options: ['颐和园', '拙政园', '圆明园', '狮子林', '避暑山庄'],
        correctAnswers: [0, 2, 4]
      },
      {
        id: 'm3',
        content: '下列哪些诗句描写了雨景？（多选）',
        options: ['好雨知时节，当春乃发生', '空山新雨后，天气晚来秋', '漠漠水田飞白鹭，阴阴夏木啭黄鹂', '夜来风雨声，花落知多少'],
        correctAnswers: [0, 1, 3]
      },
      {
        id: 'm4',
        content: '下列哪些是中国古代著名的城市规划理念？（多选）',
        options: ['前朱雀，后玄武，左青龙，右白虎', '天人合一', '藏风聚气', '因地制宜', '对称布局'],
        correctAnswers: [0, 1, 2, 3, 4]
      },
      {
        id: 'm5',
        content: '下列哪些城市曾是中国的古都？（多选）',
        options: ['北京', '西安', '洛阳', '南京', '杭州', '开封'],
        correctAnswers: [0, 1, 2, 3, 5]
      }
    ];
    
    // 模拟填空题
    const fillQuestions = [
      {
        id: 'f1',
        content: '《诗经》中"__，有梅"描述的是早春景象。',
        correctAnswer: '南有乔木',
        alternativeAnswers: ['南有乔木']
      },
      {
        id: 'f2',
        content: '中国四大名园分别是：颐和园、__、拙政园、留园。',
        correctAnswer: '承德避暑山庄',
        alternativeAnswers: ['承德避暑山庄', '避暑山庄']
      },
      {
        id: 'f3',
        content: '杜甫的"__，万里无云"描述了晴朗天空的壮丽景象。',
        correctAnswer: '九天阊阖开宫殿',
        alternativeAnswers: ['九天阊阖开宫殿', '九天阊阖']
      },
      {
        id: 'f4',
        content: '在中国传统文化中，__被称为"天下第一福地，财富之地"。',
        correctAnswer: '江南',
        alternativeAnswers: ['江南', '江南地区']
      },
      {
        id: 'f5',
        content: '古代对城市的周围修建城墙，主要起到__和__的作用。（答案用逗号分隔）',
        correctAnswer: '防御,象征',
        alternativeAnswers: ['防御,象征', '军事防御,政治象征', '军事,象征']
      }
    ];
    
    this.setData({
      'questions.single': singleQuestions,
      'questions.multiple': multipleQuestions,
      'questions.fill': fillQuestions
    });
    
    // 启动PK
    this.startPK();
  },
  
  /**
   * 开始PK
   */
  async startPK() {
    const single = Array.isArray(this.data.questions.single) ? this.data.questions.single : [];
    const multiple = Array.isArray(this.data.questions.multiple) ? this.data.questions.multiple : [];
    const fill = Array.isArray(this.data.questions.fill) ? this.data.questions.fill : [];
    const allQuestions = [...single, ...multiple, ...fill];

    // 获取用户的答题进度
    const userProgress = await this.getUserAnswerProgress();
    console.log('用户答题进度:', userProgress);

    // 如果用户已完成所有题目，直接显示结果
    if (userProgress >= allQuestions.length) {
      console.log('用户已完成所有题目，显示结果');
      this.showFinalResults();
      return;
    }

    // 根据进度确定当前题目
    let currentIndex = userProgress;
    let currentType = 'single';
    let currentQuestion = null;

    if (currentIndex < single.length) {
      currentType = 'single';
      currentQuestion = single[currentIndex];
    } else if (currentIndex < single.length + multiple.length) {
      currentType = 'multiple';
      currentQuestion = multiple[currentIndex - single.length];
    } else {
      currentType = 'fill';
      currentQuestion = fill[currentIndex - single.length - multiple.length];
    }

    console.log('从题目索引开始:', {
      currentIndex,
      currentType,
      currentQuestion
    });

    const selectedOption = null;
    const selectedOptions = {};

    this.setData({
      currentState: 'question',
      statusText: '抢答模式：第一个抢答正确者得分！',
      showTimer: true,
      currentQuestionType: currentType,
      currentQuestion: currentQuestion,
      currentQuestionIndex: currentIndex,
      allQuestions: allQuestions,
      isAnswered: false,
      firstAnswerFaction: '',
      selectedOption,
      selectedOptions,
      canSubmit: false,
      fillAnswers: [],
      totalQuestions: allQuestions.length,
      answeredQuestions: currentIndex  // 设置已答题数为当前进度
    });
    
    console.log('PK开始，初始化selectedOption:', selectedOption); // 调试日志
    
    // 开始计时
    this.startTimer();
  },
  
  /**
   * 启动计时器
   */
  startTimer() {
    // 清除可能存在的旧计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    
    this.setData({
      timeRemaining: 30,
      isAnswered: false,
      firstAnswerFaction: ''
    });
    
    // 设置新的计时器
    const timerInterval = setInterval(() => {
      // 如果PK已结束，停止计时器
      if (this.data.currentState === 'ended') {
        clearInterval(timerInterval);
        return;
      }

      const newTime = this.data.timeRemaining - 1;
      
      if (newTime < 0) {
        // 时间到了自动结束此题
        clearInterval(timerInterval);
        
        // 如果没有人回答，两个阵营都不得分
        if (!this.data.isAnswered) {
          wx.showToast({
            title: '时间到，无人答题',
            icon: 'none'
          });
          
          // 即使没有答题，也要更新索引（表示这题已经跳过）
          this.updateAnswerIndex();
          
          // 延迟后进入下一题
          this.nextQuestionTimeout = setTimeout(() => {
            this.goToNextQuestion();
          }, 1500);
        }
      } else {
        this.setData({
          timeRemaining: newTime
        });
      }
    }, 1000);
    
    this.setData({
      timerInterval: timerInterval
    });
  },
  
  /**
   * 单选题选择选项
   */
  selectOption(e) {
    // 检查PK是否已结束
    if (this.data.pkStatus === 'ended') {
      return;
    }

    // 如果已经有人抢答过，则不能再选择
    if (this.data.isAnswered) {
      return;
    }
    
    const optionIndex = e.currentTarget.dataset.optionIndex;
    console.log('选择单选题选项:', optionIndex);
    
    // 立即设置选中状态，提供视觉反馈
    this.setData({
      selectedOption: optionIndex,
      canSubmit: true
    });
    
    // 提供触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
  },
  
  /**
   * 多选题切换选项
   */
  toggleOption(e) {
    // 检查PK是否已结束
    if (this.data.pkStatus === 'ended') {
      return;
    }

    // 如果已经有人抢答过，则不能再选择
    if (this.data.isAnswered) {
      return;
    }
    
    const optionIndex = e.currentTarget.dataset.optionIndex;
    console.log('切换多选题选项:', optionIndex);
    
    // 获取当前的选中状态
    let selectedOptions = { ...this.data.selectedOptions };
    
    // 检查是否已经选中
    if (selectedOptions[optionIndex]) {
      // 如果已经选中，则取消选中
      delete selectedOptions[optionIndex];
    } else {
      // 如果未选中，则添加到选中列表
      selectedOptions[optionIndex] = true;
    }
    
    console.log('多选题选项切换后:', selectedOptions);
    
    // 更新选中状态
    this.setData({
      selectedOptions: selectedOptions,
      canSubmit: Object.keys(selectedOptions).length > 0
    });
    
    // 提供触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
  },
  
  /**
   * 更新填空题答案
   */
  updateFillAnswer(e) {
    // 检查PK是否已结束
    if (this.data.pkStatus === 'ended') {
      return;
    }

    if (this.data.isAnswered) {
      return;
    }
    
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    let fillAnswers = [...this.data.fillAnswers];
    
    // 确保数组长度足够
    while (fillAnswers.length <= index) {
      fillAnswers.push('');
    }
    
    fillAnswers[index] = value;
    
    this.setData({
      fillAnswers: fillAnswers,
      canSubmit: fillAnswers.some(answer => answer && answer.trim().length > 0)
    });
  },
  
  /**
   * 提交答案
   */
  submitAnswer() {
    // 检查PK是否已结束
    if (this.data.pkStatus === 'ended') {
      return;
    }

    // 如果已经有人抢答过，则不能再提交
    if (this.data.isAnswered) {
      return;
    }

    // 检查当前题目是否存在
    if (!this.data.currentQuestion) {
      console.error('当前题目不存在:', this.data);
      wx.showToast({
        title: '题目加载错误',
        icon: 'error'
      });
      return;
    }
    
    // 清除计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.setData({
        timerInterval: null
      });
    }
    
    const { 
      currentQuestionType, 
      currentQuestion, 
      selectedOption,
      selectedOptions, 
      fillAnswers, 
      userFaction,
      optionLetters
    } = this.data;

    console.log('提交答案:', {
      currentQuestionType,
      currentQuestion,
      selectedOption,
      selectedOptions,
      fillAnswers,
      userFaction
    });
    
    // 标记该题已被抢答，记录抢答阵营
    this.setData({
      isAnswered: true,
      firstAnswerFaction: userFaction,
      currentState: 'waiting'  // 立即进入等待状态
    });
    
    // 检查答案是否正确
    let isCorrect = false;
    let userAnswer = '';
    
    try {
      if (currentQuestionType === 'single') {
        // 单选题：直接使用字母形式
        userAnswer = optionLetters[selectedOption];
        // 处理数组形式的答案
        const correctAnswer = Array.isArray(currentQuestion.correctAnswer) ? 
          currentQuestion.correctAnswer[0] : currentQuestion.correctAnswer;
        isCorrect = userAnswer === correctAnswer;
      } else if (currentQuestionType === 'multiple') {
        // 多选题：将选中的索引转换为字母，并按字母顺序排序
        const selectedIndexes = Object.keys(selectedOptions).map(Number);
        if (selectedIndexes.length === 0) {
          wx.showToast({
            title: '请至少选择一个选项',
            icon: 'none'
          });
          return;
        }
        // 转换为字母形式并排序
        userAnswer = selectedIndexes
          .map(index => optionLetters[index])
          .sort()
          .join('');
        // 处理数组形式的答案
        const correctAnswer = Array.isArray(currentQuestion.correctAnswer) ? 
          currentQuestion.correctAnswer.sort().join('') : currentQuestion.correctAnswer;
        isCorrect = userAnswer === correctAnswer;
      } else if (currentQuestionType === 'fill') {
        // 填空题：处理多个空格的答案
        if (!Array.isArray(fillAnswers)) {
          wx.showToast({
            title: '答案格式错误',
            icon: 'error'
          });
          return;
        }
        
        // 检查是否所有必填空格都已填写
        const requiredBlanks = Array.isArray(currentQuestion.correctAnswer) ? 
          currentQuestion.correctAnswer.length : 1;
        
        const emptyAnswers = fillAnswers.slice(0, requiredBlanks).filter(answer => 
          !answer || !answer.trim()
        );
        
        if (emptyAnswers.length > 0) {
          wx.showToast({
            title: '请填写所有空格',
            icon: 'none'
          });
          this.setData({
            isAnswered: false,
            currentState: 'question'
          });
          return;
        }
        
        // 处理多空格答案比较
        if (Array.isArray(currentQuestion.correctAnswer)) {
          isCorrect = currentQuestion.correctAnswer.every((correctAns, index) => {
            const userAns = (fillAnswers[index] || '').trim();
            const correctAns_trimmed = (correctAns || '').trim();
            return userAns === correctAns_trimmed;
          });
          userAnswer = fillAnswers.map(ans => (ans || '').trim()).join(',');
        } else {
          // 单空格情况
          userAnswer = (fillAnswers[0] || '').trim();
          isCorrect = userAnswer === currentQuestion.correctAnswer.trim();
        }
      }
    } catch (error) {
      console.error('答案判断出错:', error, {
        currentQuestionType,
        currentQuestion,
        userAnswer
      });
      wx.showToast({
        title: '答案判断出错',
        icon: 'error'
      });
      return;
    }
    
    console.log('答案判断:', {
      type: currentQuestionType,
      userAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      processedCorrectAnswer: Array.isArray(currentQuestion.correctAnswer) ? 
        (currentQuestionType === 'multiple' ? currentQuestion.correctAnswer.sort().join('') : currentQuestion.correctAnswer[0]) : 
        currentQuestion.correctAnswer,
      isCorrect
    });
    
    // 更新阵营得分（使用新的统一计分：每题1分）
    const scoreToAdd = isCorrect ? 1 : 0;
    if (userFaction === 'tower') {
      this.setData({
        towerScore: this.data.towerScore + scoreToAdd
      });
    } else {
      this.setData({
        rainScore: this.data.rainScore + scoreToAdd
      });
    }
    
    // 更新个人答题统计
    let { answeredQuestions, correctAnswers } = this.data;
    let userScore = this.data.userScore || 0; // 从this.data中获取userScore，如果不存在则初始化为0
    answeredQuestions++;
    
    // 根据题目类型计算分数（无论对错都要计算，用于PK会话）
    let thisQuestionScore = 0;
    if (isCorrect) {
      correctAnswers++;
      // 所有题型统一为1分
      thisQuestionScore = 1;
      userScore = (this.data.userScore || 0) + thisQuestionScore;

      console.log('得分详情:', {
        题目类型: currentQuestionType,
        本题应得分: thisQuestionScore,
        当前累计分: userScore,
        答案: userAnswer,
        正确答案: currentQuestion.correctAnswer
      });
    }
    
    this.setData({
      answeredQuestions,
      correctAnswers,
      userScore
    });

    // 提交答案到多人PK会话
    this.submitAnswerToPkSession(isCorrect, thisQuestionScore);
    
    // 更新答题进度索引
    this.updateAnswerIndex();
    
    // 显示答题结果提示
    wx.showToast({
      title: isCorrect ? '答对了' : '答错了',
      icon: isCorrect ? 'success' : 'error',
      duration: 1500
    });

    // 异步上传答题数据到云数据库（不影响本地判断和显示）
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
        name: 'pkBattle',
        data: {
          action: 'submitAnswer',
          data: {
            userId: wx.getStorageSync('userId'),
            questionId: currentQuestion._id,
            answer: userAnswer,
            timeUsed: 30 - this.data.timeRemaining,
            factionId: userFaction,
            isCorrect: isCorrect,
            score: isCorrect ? 100 - (30 - this.data.timeRemaining) * 2 : 0
          }
        }
      });
    }).then(res => {
      if (res.result && res.result.success) {
        console.log('答题数据上传成功:', res.result);
        
        // 如果服务器返回了最新的分数，则更新
        if (res.result.data.factionScores) {
          this.setData({
            towerScore: res.result.data.factionScores.tower || this.data.towerScore,
            rainScore: res.result.data.factionScores.rain || this.data.rainScore
          });
        }
      } else {
        console.error('上传答题数据失败:', res.result?.error || '未知错误');
      }
    }).catch(error => {
      console.error('上传答题云函数调用失败:', error);
    });

    // 检查是否是最后一题（动态计算总题数）
    const singleCount = Array.isArray(this.data.questions.single) ? this.data.questions.single.length : 0;
    const multipleCount = Array.isArray(this.data.questions.multiple) ? this.data.questions.multiple.length : 0;
    const fillCount = Array.isArray(this.data.questions.fill) ? this.data.questions.fill.length : 0;
    const total = singleCount + multipleCount + fillCount;
    if (this.data.currentQuestionIndex >= total - 1) {
      // 记录PK完成活动
      // 创建跨环境调用的Cloud实例
      var c2 = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      c2.init().then(() => {
        return c2.callFunction({
          name: 'xsj_auth',
          data: {
            action: 'recordUserActivity',
            description: '参加了PK大赛',
            type: 'pk',
            reward: this.data.userScore // 使用最终得分作为奖励
          }
        });
      }).catch(err => {
        console.error('记录PK活动失败:', err);
      });
      
      // 延迟后显示最终结果
      setTimeout(() => {
        this.showFinalResults();
      }, 1500);
      return;
    }
    
    // 如果不是最后一题，延迟后进入下一题
    this.nextQuestionTimeout = setTimeout(() => {
      this.goToNextQuestion();
    }, 1500);
  },
  
  /**
   * 上传答题数据
   */
  uploadAnswer(answerData) {
    // 获取用户ID
    const userId = wx.getStorageSync('userId');
    
    // 调用云函数提交答案
    const cloud = new wx.cloud.Cloud({
      identityless: true,
      resourceAppid: 'wx85d92d28575a70f4',
      resourceEnv: 'cloud1-1gsyt78b92c539ef'
    });
    cloud.init().then(() => {
      return cloud.callFunction({
        name: 'pkBattle',
        data: {
          action: 'submitAnswer',
          data: {
            userId: userId,
            factionId: this.data.userFaction,
            ...answerData,
            createTime: new Date().getTime()
          }
        }
      });
    }).then(res => {
      if (res.result && res.result.success) {
        console.log('答题数据上传成功:', res.result);
        
        // 如果服务器返回了最新的分数，则更新
        if (res.result.data.factionScores) {
          this.setData({
            towerScore: res.result.data.factionScores.tower || this.data.towerScore,
            rainScore: res.result.data.factionScores.rain || this.data.rainScore
          });
        }
      } else {
        console.error('上传答题数据失败:', res.result?.error || '未知错误');
      }
    }).catch(error => {
      console.error('上传答题云函数调用失败:', error);
    });
  },
  
  /**
   * 生成随机的虚拟用户排行榜
   */
  // virtualUsers: [
  //   '春风归人', '雨巷漫步', '白鹭青洲', '墨池飞雪', '青衫故人',
  //   '烟雨江南', '雁南飞', '竹影清风', '云水禅心', '山间明月',
  //   '华灯初上', '烟波浩渺', '古道西风', '星辰大海', '风雨同舟',
  //   '花开半夏', '清风徐来', '木叶之秋', '湖光山色', '冬雪初霁',
  //   '梅花三弄', '杏花微雨', '兰亭序', '诗魂墨韵', '桃花扇',
  //   '渔樵问答', '闲云野鹤', '竹林七贤', '松风琴韵', '岁月如歌',
  //   '溪山行旅', '林泉高致', '江畔独步', '枫桥夜泊', '雨打芭蕉',
  //   '青山隐隐', '水墨丹青', '长亭外', '故园风雨', '烟雨楼台',
  //   '小桥流水', '落花流水', '飞花令', '红袖添香', '绿竹青青',
  //   '昭华旧事', '锦瑟年华', '流年似水', '梧桐细雨', '山水清音'
  // ]
  generateVirtualRanking() {
    // 保留原有的 generateVirtualRanking 方法作为备用
    const factions = ['tower', 'rain'];
    const names = ['星河折光', 'Aurorabyte', '影ノ森', 'Lunnaya Ten', '艾樱', '墨青逐月', 'Vientooooo', 'Neonharbor', '霜落千山', 'Pixelwarden', '北巷旧灯', 'Resonanzwolf'];
    const scores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1];
    
    return names.map((name, index) => ({
      name,
      faction: factions[Math.floor(Math.random() * factions.length)],
      score: scores[index],
      isCurrentUser: index === 0 // 让第一个用户作为当前用户
    }));
  },
  
  /**
   * 字符串哈希函数，用于生成固定的随机数种子华灯初上', '烟波浩渺', '古道西风', '星辰大海', '风雨同舟',
  //   '花开半夏', '清风徐来', '木叶之秋', '湖光山色', '冬雪初霁',
  //   '梅花三弄', '杏花微雨', '兰亭序', '诗魂墨韵', '桃花扇',
  //   '渔樵问答', '闲云野鹤', '竹林七贤', '松风琴韵', '岁月如歌',
  //   '溪山行旅', '林泉高致', '江畔独步', '枫桥夜泊', '雨打芭蕉',
  //   '青山隐隐', '水墨丹青', '长亭外', '故园风雨', '烟雨楼台',
  //   '小桥流水', '落花流水', '飞花令', '红袖添香', '绿竹青青',
  //   '昭华旧事', '锦瑟年华', '流年似水', '梧桐细雨', '山水清音'
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // 转换为32位整数
    }
    return Math.abs(hash);
  },
  
  /**
   * 根据种子打乱数组
   */
  shuffleWithSeed(array, seed) {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;
    
    // 使用种子生成伪随机数
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // Fisher-Yates 洗牌算法
    while (currentIndex !== 0) {
      randomIndex = Math.floor(random() * currentIndex);
      currentIndex -= 1;
      
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    
    return array;
  },

  /**
   * 提交答案到PK会话
   */
  submitAnswerToPkSession(isCorrect, score) {
    if (!this.data.questionSetId) {
      console.log('没有PK会话ID，跳过提交');
      return;
    }

    console.log('提交答案到PK会话:', {
      questionSetId: this.data.questionSetId,
      userFaction: this.data.userFaction,
      questionIndex: this.data.currentQuestionIndex,
      isCorrect: isCorrect,
      score: score
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
    c.init().then(() => {
      return c.callFunction({
        name: 'pkBattle',
        data: {
          action: 'submitPkAnswer',
          data: {
            questionSetId: this.data.questionSetId,
            userFaction: this.data.userFaction,
            questionIndex: this.data.currentQuestionIndex,
            isCorrect: isCorrect,
            score: score
          }
        }
      });
    }).then(res => {
      if (res.result && res.result.success) {
        console.log('答案提交到PK会话成功:', res.result);
        
        // 如果返回了最新的阵营数据，更新页面显示
        if (res.result.data.factions) {
          const factions = res.result.data.factions;
          this.setData({
            towerScore: factions[0].totalScore,
            rainScore: factions[1].totalScore,
            towerCount: factions[0].userCount,
            rainCount: factions[1].userCount
          });
        }
      } else {
        console.error('答案提交到PK会话失败:', res.result);
        wx.showToast({
          title: res.result.error || '提交失败',
          icon: 'error'
        });
      }
    }).catch(err => {
      console.error('提交答案到PK会话出错:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
    });
  },

  /**
   * 检查PK是否已结束
   */
  checkIfPkEnded() {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const hour = chinaTime.getUTCHours();
    const minute = chinaTime.getUTCMinutes();

    console.log('检查PK是否结束:', { hour, minute });

    // 检查是否已过PK结束时间 (19:45)
    const isPkEnded = (hour > 19 || (hour === 19 && minute >= 45));

    console.log('PK是否已结束:', isPkEnded);

    if (isPkEnded) {
      // PK已结束，显示结果
      console.log('PK时间已结束，显示最终结果');
      this.showFinalResults();
    } else {
      // PK还未结束，继续等待
      const minutesLeft = Math.max(0, (19 * 60 + 45) - (hour * 60 + minute));

      console.log('PK还未结束，剩余时间:', minutesLeft, '分钟');

      this.setData({
        statusText: `答题完成，还有${minutesLeft}分钟PK结束...`
      });

      // 每30秒检查一次
      setTimeout(() => {
        if (this.data.currentState === 'waiting') {
          this.checkIfPkEnded();
        }
      }, 30000);
    }
  },

  /**
   * 页面卸载时清理定时器
   */
  onUnload() {
    if (this.pkStatusTimer) {
      clearInterval(this.pkStatusTimer);
    }
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    if (this.pkTimeChecker) {
      clearInterval(this.pkTimeChecker);
    }
    if (this.nextQuestionTimeout) {
      clearTimeout(this.nextQuestionTimeout);
    }
  },
  
  /**
   * 检查是否处于PK时间
   */
  checkPkTime() {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const day = chinaTime.getUTCDay();
    const hour = chinaTime.getUTCHours();
    const minute = chinaTime.getUTCMinutes();
    const isWeekend = (day === 6 || day === 0);
    const isWindow = (hour === 19 && minute >= 30 && minute < 45);
    const isPkTime = isWeekend && isWindow;
    
    // 更新页面状态
    this.setData({
      isPkTime: isPkTime
    });
    
    // 注释掉时间检查相关的提示
    
    return isPkTime;
  },
  
  /**
   * 检查PK状态
   */
  checkPkStatus() {
    if (!this.data.isPkTime) {
      // 如果不是PK时间，不启动PK
      return;
    }
    
    // 实际应连接后端API，这里使用模拟数据
    // TODO: 使用wx.request连接实际API
    
    // 模拟API调用
    setTimeout(() => {
      // 模拟PK正在进行中的状态
      this.startPK();
    }, 2000);
  },
  
  /**
   * 处理答案显示格式，将字母答案或数字索引转换为选项内容
   */
  processAnswersForDisplay() {
    const questions = this.data.questions;
    const optionLetters = this.data.optionLetters;

    console.log('处理答案显示格式，原始题目数据:', questions);

    // 处理单选题
    const processedSingle = questions.single.map(question => {
      let displayAnswer = question.correctAnswer;

      if (question.options && Array.isArray(question.options)) {
        // 如果是数字索引
        if (typeof question.correctAnswer === 'number') {
          if (question.correctAnswer >= 0 && question.correctAnswer < question.options.length) {
            displayAnswer = question.options[question.correctAnswer];
          }
        }
        // 如果是字母答案
        else if (typeof question.correctAnswer === 'string') {
          const answerIndex = optionLetters.indexOf(question.correctAnswer);
          if (answerIndex !== -1 && answerIndex < question.options.length) {
            displayAnswer = question.options[answerIndex];
          }
        }
      }

      console.log('单选题处理:', {
        原始答案: question.correctAnswer,
        选项: question.options,
        显示答案: displayAnswer
      });

      return {
        ...question,
        displayAnswer: displayAnswer
      };
    });

    // 处理多选题
    const processedMultiple = questions.multiple.map(question => {
      // 多选题可能使用 correctAnswer 或 correctAnswers 字段
      const correctAnswerData = question.correctAnswers || question.correctAnswer;
      let displayAnswer = correctAnswerData;

      if (question.options && Array.isArray(question.options)) {
        // 如果是数组索引
        if (Array.isArray(correctAnswerData)) {
          const answerContents = correctAnswerData.map(index => {
            if (typeof index === 'number' && index >= 0 && index < question.options.length) {
              return question.options[index];
            }
            return index;
          });
          displayAnswer = answerContents.join('、');
        }
        // 如果是字母答案字符串
        else if (typeof correctAnswerData === 'string') {
          const answerLetters = correctAnswerData.split('');
          const answerContents = answerLetters.map(letter => {
            const answerIndex = optionLetters.indexOf(letter);
            if (answerIndex !== -1 && answerIndex < question.options.length) {
              return question.options[answerIndex];
            }
            return letter;
          });
          displayAnswer = answerContents.join('、');
        }
      }

      console.log('多选题处理:', {
        原始答案: correctAnswerData,
        选项: question.options,
        显示答案: displayAnswer
      });

      return {
        ...question,
        displayAnswer: displayAnswer
      };
    });

    // 填空题不需要特殊处理
    const processedFill = questions.fill.map(question => ({
      ...question,
      displayAnswer: question.correctAnswer
    }));

    console.log('处理后的题目数据:', {
      single: processedSingle,
      multiple: processedMultiple,
      fill: processedFill
    });

    return {
      single: processedSingle,
      multiple: processedMultiple,
      fill: processedFill
    };
  },
  
  /**
   * 显示最终结果
   */
  showFinalResults() {
    // 清除所有计时器，确保倒计时停止
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    if (this.pkTimeChecker) {
      clearInterval(this.pkTimeChecker);
    }
    if (this.pkStatusTimer) {
      clearInterval(this.pkStatusTimer);
    }

    // 更新状态为结束
    this.setData({
      currentState: 'result',
      statusText: '统计中...',
      showTimer: false // 隐藏计时器
    });
    
    // 显示加载中
    wx.showLoading({
      title: '获取结果中...',
    });
    
    // 直接使用本地计算的结果
    this.useLocalResults();
  },
  
  /**
   * 使用本地计算的结果
   */
  async useLocalResults() {
    // 判断获胜阵营
    const winnerFaction = this.data.towerScore > this.data.rainScore ? 'tower' : 'rain';
    
    // 使用最新的分数，而不是correctAnswers
    const userScore = this.data.userScore;
    
    // 计算用户奖励
    // 基础奖励：每分得1颗树
    const totalReward = userScore;

    console.log('PK结果奖励计算:', {
      userScore,
      totalReward,
      userFaction: this.data.userFaction,
      winnerFaction,
      towerScore: this.data.towerScore,
      rainScore: this.data.rainScore
    });

    // 处理答案显示格式
    const processedQuestions = this.processAnswersForDisplay();
    
    // 首先尝试获取真实排行榜数据
    try {
      console.log('尝试获取真实排行榜数据');
      await this.loadRealRankingData();
      
      // 计算平均正确率
      const avgCorrectRate = this.data.answeredQuestions > 0 ? 
        ((this.data.correctAnswers / this.data.answeredQuestions * 100) | 0) : 0;
      
      // 更新页面状态
      this.setData({
        currentState: 'result',  // 设置为结束状态显示结果页面
        avgCorrectRate: avgCorrectRate,
        showAnswers: true,  // 默认展开参考答案
        userScore: userScore,  // 确保使用最新的分数
        userReward: totalReward,
        questions: processedQuestions  // 使用处理后的题目数据
      });
      
      // 更新用户的树木奖励
      this.updateUserReward(totalReward);
      
    } catch (error) {
      console.error('获取真实排行榜失败，使用虚拟数据:', error);
      this.loadVirtualRankingData();
      
      // 计算平均正确率
      const avgCorrectRate = this.data.answeredQuestions > 0 ? 
        ((this.data.correctAnswers / this.data.answeredQuestions * 100) | 0) : 0;
      
      // 更新页面状态
      this.setData({
        currentState: 'result',  // 设置为结束状态显示结果页面
        avgCorrectRate: avgCorrectRate,
        showAnswers: true,  // 默认展开参考答案
        userScore: userScore,  // 确保使用最新的分数
        userReward: totalReward,
        questions: processedQuestions  // 使用处理后的题目数据
      });
      
      // 更新用户的树木奖励
      this.updateUserReward(totalReward);
    }
    
    wx.hideLoading();
  },

  /**
   * 进入下一题
   */
  goToNextQuestion() {
    const singleCount = Array.isArray(this.data.questions.single) ? this.data.questions.single.length : 0;
    const multipleCount = Array.isArray(this.data.questions.multiple) ? this.data.questions.multiple.length : 0;
    const fillCount = Array.isArray(this.data.questions.fill) ? this.data.questions.fill.length : 0;
    const total = singleCount + multipleCount + fillCount;

    let { currentQuestionIndex } = this.data;
    if (currentQuestionIndex >= total - 1) {
      // 答题完成，直接显示结果
      console.log('答题完成，显示最终结果');
      this.showFinalResults();
      return;
    }

    const nextQuestionIndex = currentQuestionIndex + 1;
    let nextQuestionType;
    if (nextQuestionIndex < singleCount) {
      nextQuestionType = 'single';
    } else if (nextQuestionIndex < singleCount + multipleCount) {
      nextQuestionType = 'multiple';
    } else {
      nextQuestionType = 'fill';
    }

    const typeIndex = nextQuestionType === 'single'
      ? nextQuestionIndex
      : nextQuestionType === 'multiple'
        ? nextQuestionIndex - singleCount
        : nextQuestionIndex - singleCount - multipleCount;
    
    console.log('切换题目:', {
      nextQuestionIndex,
      nextQuestionType,
      typeIndex,
      questionsData: this.data.questions
    });

    // 检查题目数据是否存在
    if (!this.data.questions || !this.data.questions[nextQuestionType]) {
      console.error('题目数据不存在:', {
        questions: this.data.questions,
        nextQuestionType
      });
      // 显示错误提示
      wx.showToast({
        title: '题目加载失败',
        icon: 'error',
        duration: 2000
      });
      return;
    }

    const nextQuestion = this.data.questions[nextQuestionType][typeIndex];

    // 检查题目是否获取成功
    if (!nextQuestion) {
      console.error('无法获取下一题:', {
        nextQuestionType,
        typeIndex,
        questions: this.data.questions[nextQuestionType]
      });
      // 显示错误提示
      wx.showToast({
        title: '题目加载失败',
        icon: 'error',
        duration: 2000
      });
      return;
    }
    
    // 根据题目类型创建适当的selectedOptions
    let selectedOption;
    let selectedOptions;
    if (nextQuestionType === 'multiple') {
      // 多选题使用空对象
      selectedOptions = {};
    } else {
      // 单选题和填空题
      selectedOption = null;
      selectedOptions = {};
    }
    
    // 初始化填空答案数组
    const newFillAnswers = nextQuestionType === 'fill' && nextQuestion && nextQuestion.correctAnswer && Array.isArray(nextQuestion.correctAnswer) 
      ? new Array(nextQuestion.correctAnswer.length).fill('')
      : [];
    
    // 重置答题状态并直接开始下一题
    this.setData({
      currentQuestionIndex: nextQuestionIndex,
      currentQuestionType: nextQuestionType,
      currentQuestion: nextQuestion,
      currentState: 'question',
      statusText: '抢答模式：第一个抢答正确者得分！',
      selectedOption: selectedOption,
      selectedOptions: selectedOptions,
      fillAnswers: newFillAnswers,
      canSubmit: false,
      isAnswered: false,
      firstAnswerFaction: ''
    });

    // 清除之前的计时器和可能的延迟调用，然后开始新一题的计时
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.setData({
        timerInterval: null
      });
    }
    
    // 清除可能存在的延迟调用
    if (this.nextQuestionTimeout) {
      clearTimeout(this.nextQuestionTimeout);
      this.nextQuestionTimeout = null;
    }
    
    // 开始新一题的计时
    this.startTimer();
  },
  
  /**
   * 更新用户奖励
   */
  async updateUserReward(reward) {
    // 获取今天的日期字符串（中国时区）
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const dateStr = chinaTime.toISOString().split('T')[0];

    try {
      console.log('开始更新用户奖励，奖励数量：', reward);

      console.log('准备标记PK完成，参数:', {
        questionSetId: this.data.questionSetId || dateStr,
        finalScore: this.data.userScore || 0,
        correctAnswers: this.data.correctAnswers || 0,
        totalAnswers: this.data.answeredQuestions || 0
      });

      // 先调用云函数标记PK完成状态（无论奖励多少都要标记完成）
      // openid 将在云函数中自动获取
      const c = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await c.init();
      const markResult = await c.callFunction({
        name: 'pkBattle',
        data: {
          action: 'completePk',
          data: {
            questionSetId: this.data.questionSetId || dateStr,
            finalScore: this.data.userScore || 0,
            correctAnswers: this.data.correctAnswers || 0,
            totalAnswers: this.data.answeredQuestions || 0
          }
        }
      });

      console.log('标记PK完成状态结果:', markResult.result);

      if (!markResult.result || !markResult.result.success) {
        // 如果标记失败，说明可能已经完成或其他错误
        const errorMsg = markResult.result?.error || '标记完成状态失败';
        console.log('PK完成状态标记失败:', errorMsg);

        if (errorMsg.includes('重复领取')) {
          wx.showToast({
            title: '今日PK奖励已领取',
            icon: 'none',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
        return;
      }

      // 标记成功，检查是否需要发放奖励
      console.log('PK完成状态标记成功');

      if (reward <= 0) {
        console.log('奖励为0，跳过奖励发放，但已标记完成状态');
        wx.showToast({
          title: 'PK已完成',
          icon: 'success',
          duration: 2000
        });
        return;
      }

      console.log('继续发放奖励，数量：', reward);

      // 先获取云端最新数据
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await cloud.init();
      const getUserResult = await cloud.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getUserInfo'
        }
      });

      if (!getUserResult.result || !getUserResult.result.success) {
        throw new Error('获取用户信息失败');
      }

      const userData = getUserResult.result.data;
      const currentLantingTrees = userData.lantingTrees || 0;
      const currentTreeCount = userData.treeCount || 0;

      console.log('云端当前数据：', {
        lantingTrees: currentLantingTrees,
        treeCount: currentTreeCount
      });

      // 计算新的数量
      const newLantingTrees = currentLantingTrees + reward;
      const newTreeCount = currentTreeCount + reward;

      console.log('计算后的新数据：', {
        lantingTrees: newLantingTrees,
        treeCount: newTreeCount
      });

      // 调用云函数更新数据库
      const updateResult = await cloud.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'updateUserInfo',
          data: {
            lantingTrees: newLantingTrees,
            treeCount: newTreeCount
          }
        }
      });

      if (updateResult.result && updateResult.result.success) {
        console.log('云数据库更新成功');

        // 更新全局数据（以云端数据为准）
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.lantingTrees = newLantingTrees;
          app.globalData.treeCount = newTreeCount;
        }

        // 显示获得奖励的提示
        wx.showToast({
          title: `获得${reward}棵树苗！`,
          icon: 'success',
          duration: 2000
        });
      } else {
        throw new Error(updateResult.result?.message || '更新失败');
      }
    } catch (error) {
      console.error('更新用户奖励失败:', error);
      wx.showToast({
        title: '奖励同步失败',
        icon: 'error',
        duration: 2000
      });
    }
  },
  
  /**
   * 返回首页
   */
  returnToHome() {
    wx.navigateBack();
  },
  
  
  /**
   * 切换参考答案区域的显示/隐藏状态
   */
  toggleAnswersDisplay() {
    this.setData({
      showAnswers: !this.data.showAnswers
    });
    
    // 提供振动反馈
    wx.vibrateShort({
      type: 'light'
    });
  },

  /**
   * 刷新排行榜（从数据库获取真实数据）
   */
  async refreshRanking() {
    console.log('开始刷新排行榜');
    
    wx.showLoading({
      title: '刷新中...',
      mask: true
    });

    try {
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      
      await cloud.init();
      
      // 获取今天的日期（中国时区）
      const today = new Date();
      const chinaTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
      const dateStr = chinaTime.toISOString().split('T')[0];
      
      console.log('刷新排行榜 - 传递的日期:', dateStr);
      
      const result = await cloud.callFunction({
        name: 'getRankings',
        data: {
          action: 'getTodayRanking',
          date: dateStr  // 添加日期参数
        }
      });

      console.log('排行榜数据获取结果：', result);

      if (result.result && result.result.success) {
        const rankingsData = result.result.data;
        const rankings = rankingsData.rankings || [];
        
        console.log(`获取到 ${rankings.length} 条排行榜数据`);
        
        // 处理排行榜数据，只显示前10名，直接使用云函数返回的isCurrentUser
        const topPerformers = rankings.slice(0, 10).map(item => ({
          name: item.username,
          faction: item.faction,
          score: item.score,
          isCurrentUser: item.isCurrentUser  // 直接使用云函数标记的结果
        }));

        // 查找当前用户的排名，使用云函数返回的isCurrentUser标识
        const userIndex = rankings.findIndex(item => item.isCurrentUser);
        const userRanking = userIndex >= 0 ? userIndex + 1 : 0;

        console.log('处理后的排行榜数据：', {
          topPerformers,
          userRanking,
          totalParticipants: rankingsData.totalParticipants
        });

        this.setData({
          topPerformers: topPerformers,
          userRanking: userRanking
        });

        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1500
        });
      } else {
        throw new Error(result.result?.message || '获取排行榜失败');
      }
    } catch (error) {
      console.error('刷新排行榜失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'error',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 加载真实排行榜数据
   */
  async loadRealRankingData() {
    const cloud = new wx.cloud.Cloud({
      identityless: true,
      resourceAppid: 'wx85d92d28575a70f4',
      resourceEnv: 'cloud1-1gsyt78b92c539ef'
    });
    
    await cloud.init();
    
    // 不需要在前端获取openid，云函数会直接标记当前用户
    
    // 获取今天的日期（中国时区）
    const today = new Date();
    const chinaTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const dateStr = chinaTime.toISOString().split('T')[0];
    
    console.log('前端传递的日期:', dateStr);
    console.log('准备调用getRankings云函数...');
    
    const result = await cloud.callFunction({
      name: 'getRankings',
      data: {
        action: 'getTodayRanking',
        date: dateStr  // 明确传递日期参数
      }
    });
    
    console.log('getRankings云函数调用结果:', result);

    if (!result.result || !result.result.success) {
      throw new Error(result.result?.message || '获取排行榜失败');
    }

    const rankingsData = result.result.data;
    const rankings = rankingsData.rankings || [];
    
    console.log(`获取到真实排行榜数据 ${rankings.length} 条`);
    
    // 调试：显示前几个用户的isCurrentUser状态
    if (rankings.length > 0) {
      console.log('排行榜前3个用户:', rankings.slice(0, 3).map(item => ({
        username: item.username,
        isCurrentUser: item.isCurrentUser
      })));
    }
    
    // 处理排行榜数据，只显示前10名，直接使用云函数返回的isCurrentUser
    const topPerformers = rankings.slice(0, 10).map(item => ({
      name: item.username,
      faction: item.faction,
      score: item.score,
      isCurrentUser: item.isCurrentUser  // 直接使用云函数标记的结果
    }));

    // 查找当前用户的排名
    const userIndex = rankings.findIndex(item => item.isCurrentUser);
    const userRanking = userIndex >= 0 ? userIndex + 1 : 0;

    this.setData({
      topPerformers: topPerformers,
      userRanking: userRanking,
      currentState: 'result'
    });

    console.log('真实排行榜数据加载完成');
  },

  /**
   * 加载阵营数据
   */
  async loadFactionData() {
    try {
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      
      await cloud.init();
      
      // 获取今天的questionSetId
      const today = new Date();
      const chinaTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
      const questionSetId = chinaTime.toISOString().split('T')[0].replace(/-/g, '');
      
      console.log('获取阵营数据，questionSetId:', questionSetId);
      
      // 获取PK会话的最新状态，包含真实的阵营人数
      const result = await cloud.callFunction({
        name: 'pkBattle',
        data: {
          action: 'getPkStatus',
          data: {
            questionSetId: questionSetId
          }
        }
      });

      console.log('获取阵营数据结果:', result);

      if (result.result && result.result.success && result.result.data.factions) {
        const factions = result.result.data.factions;
        console.log('获取到真实阵营数据:', factions);
        
        this.setData({
          towerCount: factions[0] ? factions[0].userCount : 0,
          rainCount: factions[1] ? factions[1].userCount : 0,
          towerScore: factions[0] ? factions[0].totalScore : 0,
          rainScore: factions[1] ? factions[1].totalScore : 0
        });
        
        console.log('阵营数据更新完成:', {
          towerCount: factions[0] ? factions[0].userCount : 0,
          rainCount: factions[1] ? factions[1].userCount : 0
        });
      } else {
        console.error('获取阵营数据失败:', result.result);
      }
    } catch (error) {
      console.error('获取阵营数据出错:', error);
    }
  },

  /**
   * 加载虚拟排行榜数据（备用方案）
   */
  loadVirtualRankingData() {
    console.log('使用虚拟排行榜数据');
    
    const factions = ['tower', 'rain'];
    const names = [
      '星河折光', 'Aurorabyte', '影ノ森', 'Lunnaya Ten', '艾樱',
      '墨青逐月', 'Vientooooo', 'Neonharbor', '霜落千山', 'Pixelwarden',
      '北巷旧灯', 'Resonanzwolf', '하늘꽃', 'Crimson', '沉水浮灯'
    ];

    // 生成虚拟排行榜
    const virtualRanking = names.slice(0, 9).map((name, index) => ({
      name,
      faction: factions[Math.floor(Math.random() * 2)],
      score: Math.floor(Math.random() * 11) + 5, // 5-15分
      isCurrentUser: false
    }));

    // 添加当前用户
    virtualRanking.push({
      name: '我',
      faction: this.data.userFaction,
      score: this.data.userScore,
      isCurrentUser: true
    });

    // 按分数排序
    virtualRanking.sort((a, b) => b.score - a.score);

    // 查找用户排名
    const userRank = virtualRanking.findIndex(item => item.isCurrentUser) + 1;

    this.setData({
      topPerformers: virtualRanking.slice(0, 10),
      userRanking: userRank,
      currentState: 'result'
    });

    console.log('虚拟排行榜数据加载完成');
  },

  /**
   * 更新答题进度索引
   */
  async updateAnswerIndex() {
    try {
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      
      await cloud.init();
      
      // 获取当前日期
      const now = new Date();
      const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const dateStr = chinaTime.toISOString().split('T')[0];
      
      // 计算新的索引值（当前题目索引 + 1）
      const newIndex = this.data.currentQuestionIndex + 1;
      
      console.log('更新答题进度索引:', {
        currentQuestionIndex: this.data.currentQuestionIndex,
        newIndex: newIndex,
        date: dateStr
      });
      
      // 调用云函数更新索引
      const result = await cloud.callFunction({
        name: 'pkBattle',
        data: {
          action: 'updateAnswerIndex',
          data: {
            date: dateStr,
            index: newIndex
          }
        }
      });
      
      if (result.result && result.result.success) {
        console.log('答题进度索引更新成功:', newIndex);
      } else {
        console.error('答题进度索引更新失败:', result.result);
      }
      
    } catch (error) {
      console.error('更新答题进度索引出错:', error);
    }
  },

  /**
   * 获取用户答题进度
   */
  async getUserAnswerProgress() {
    try {
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      
      await cloud.init();
      
      // 获取当前日期
      const now = new Date();
      const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const dateStr = chinaTime.toISOString().split('T')[0];
      
      // 调用云函数获取用户进度
      const result = await cloud.callFunction({
        name: 'pkBattle',
        data: {
          action: 'checkUserPkParticipation',
          data: {
            date: dateStr
          }
        }
      });
      
      if (result.result && result.result.success) {
        const userData = result.result.data;
        if (userData.hasParticipated) {
          // 用户已参与，返回当前进度索引
          const currentIndex = userData.index || 0;
          console.log('用户当前答题进度:', currentIndex);
          return currentIndex;
        } else {
          // 用户未参与，从第0题开始
          console.log('用户未参与PK，从第0题开始');
          return 0;
        }
      } else {
        console.error('获取用户答题进度失败:', result.result);
        return 0;
      }
      
    } catch (error) {
      console.error('获取用户答题进度出错:', error);
      return 0;
    }
  }
});



