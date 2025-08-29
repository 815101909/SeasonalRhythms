// 阵营PK对战页面
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面状态：'waiting'(等待), 'question'(答题), 'result'(结果)
    currentState: 'waiting',
    
    // 阵营数据
    towerCount: 258, // 楼台阵营人数，控制在500以内
    rainCount: 243, // 好雨阵营人数，控制在500以内
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
    
    // 获取用户的阵营信息
    let userFaction = wx.getStorageSync('userFaction') || '';

    // 如果本地存储中没有阵营信息，尝试从数据库获取
    if (!userFaction) {
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
          // 将阵营信息保存到本地存储
          wx.setStorageSync('userFaction', userFaction);
        }
      } catch (error) {
        console.error('获取用户阵营信息失败:', error);
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
      const pkStatusResult = await c2.callFunction({
        name: 'pkBattle',
        data: {
          action: 'checkPkStatus'
        }
      });

      if (pkStatusResult.result && pkStatusResult.result.success && pkStatusResult.result.data.isCompleted) {
        wx.showModal({
          title: '今日已参与',
          content: '您今日已完成PK大赛，请明日再来挑战！',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
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
        if (statusData.status === 'waiting') {
          // PK未开始，静默返回（避免重复弹窗）
          console.log('PK状态为waiting，静默返回');
          wx.navigateBack();
          return;
        } else if (statusData.status === 'ongoing') {
          // PK进行中，如果当前不在答题状态，则开始答题
          if (this.data.currentState === 'waiting' || this.data.currentState === 'loading') {
            this.setData({
              currentState: 'question'
            });
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
  startPK() {
    // 合并所有题目为一个数组
    const allQuestions = [
      ...this.data.questions.single,
      ...this.data.questions.multiple,
      ...this.data.questions.fill
    ];
    
    // 初始化第一题是单选题，创建适当的selectedOptions
    const firstQuestion = this.data.questions.single[0];
    const selectedOption = null; // 单选题使用索引
    const selectedOptions = {}; // 多选题使用对象
    
    this.setData({
      currentState: 'question',
      statusText: '抢答模式：第一个抢答正确者得分！',
      showTimer: true,
      currentQuestionType: 'single', // 从单选题开始
      currentQuestion: firstQuestion,
      currentQuestionIndex: 0,
      allQuestions: allQuestions,
      isAnswered: false,
      firstAnswerFaction: '',
      selectedOption: selectedOption, // 设置为null
      selectedOptions: selectedOptions, // 设置为空对象
      canSubmit: false,  // 重置提交状态
      fillAnswers: []     // 重置填空答案
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
          
          // 延迟后进入下一题
          setTimeout(() => {
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
    
    // 获取题目的树苗奖励
    const treeReward = isCorrect ? (currentQuestion.treeReward || 1) : 0;
    
    // 更新阵营得分
    if (userFaction === 'tower') {
      this.setData({
        towerScore: this.data.towerScore + treeReward
      });
    } else {
      this.setData({
        rainScore: this.data.rainScore + treeReward
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
      switch (currentQuestionType) {
        case 'single':
          thisQuestionScore = 1;
          break;
        case 'multiple':
          thisQuestionScore = 2;
          break;
        case 'fill':
          thisQuestionScore = 3;
          break;
        default:
          thisQuestionScore = 0;
      }
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

    // 检查是否是最后一题
    if (this.data.currentQuestionIndex >= 14) { // 第15题
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
    setTimeout(() => {
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
    const names = ['春风归人', '雨巷漫步', '白鹭青洲', '墨池飞雪', '青衫故人', '烟雨江南', '雁南飞', '竹影清风', '云水禅心', '山间明月', '烟波浩渺', '古道西风'];
    const scores = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4];
    
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
    const hour = now.getHours();
    const minute = now.getMinutes();

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
      const endTime = new Date();
      endTime.setHours(19, 45, 0, 0);
      const timeLeft = endTime - now;
      const minutesLeft = Math.ceil(timeLeft / (1000 * 60));

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
  },
  
  /**
   * 检查是否处于PK时间
   */
  checkPkTime() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // PK时间固定为19:30-19:45，仅限15分钟
    // const isPkTime = (hour === 19 && minute >= 30 && minute < 45);
    
    // 始终返回true，允许PK
    const isPkTime = true;
    
    // 更新页面状态
    this.setData({
      isPkTime: isPkTime
    });
    
    // 注释掉时间检查相关的提示
    /*
    // 如果不在PK时间但页面已加载，需要提示用户并返回
    if (!isPkTime && this.data.currentState !== 'loading') {
      // 计算到下一场PK的时间
      let nextPkTime;
      if (hour < 19 || (hour === 19 && minute < 30)) {
        // 今天的PK还没开始
        nextPkTime = new Date();
        nextPkTime.setHours(19, 30, 0, 0);
      } else {
        // 今天的PK已结束，等待明天的PK
        nextPkTime = new Date();
        nextPkTime.setDate(nextPkTime.getDate() + 1);
        nextPkTime.setHours(19, 30, 0, 0);
      }
      
      // 格式化时间
      const formatTime = (time) => {
        const month = time.getMonth() + 1;
        const date = time.getDate();
        const hours = time.getHours();
        const minutes = time.getMinutes();
        return `${month}月${date}日 ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
      };
      
      // 如果正在进行PK但时间已结束，直接显示结果（不弹窗）
      if (this.data.currentState === 'question') {
        this.showFinalResults(); // 直接显示结果
      } else if (this.data.currentState !== 'result') {
        // 如果不是正在显示结果，提示用户并返回
        wx.showModal({
          title: '非PK时间',
          content: `PK大赛仅在每天19:30-19:45开放，下一场PK时间：${formatTime(nextPkTime)}`,
          showCancel: false,
          success: (res) => {
            wx.navigateBack();
          }
        });
      }
    }
    */
    
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
      currentState: 'ended',
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
  useLocalResults() {
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
    
    // 生成虚拟排行榜数据，真
    const generateVirtualRanking = () => {
      const factions = ['tower', 'rain'];
      const names = [
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
      ];

      const scores = [
        26, 25, 24, 24, 23, 23, 22, 22, 21, 21,
        20, 20, 19, 19, 18, 18, 17, 17, 16, 16,
        15, 15, 14, 14, 13, 13, 12, 12, 11, 11,
        10, 10, 9, 9, 8, 8, 7, 7, 6, 6,
        5, 5, 4, 4, 3, 3, 2, 2, 1, 1
      ];

      
      // 随机打乱名字数组（防止排行榜永远固定顺序）
      const shuffledNames = [...names].sort(() => Math.random() - 0.5);

      return shuffledNames.map((name, index) => ({
        name,
        faction: factions[index % 2], // 控制平均分配阵营（可调）
        score: scores[index],
        isCurrentUser: false
      }));
    };
    
    // 获取排行榜数据
    let topPerformers = generateVirtualRanking();
    
    // 获取用户信息
    const cloud = new wx.cloud.Cloud({
      identityless: true,
      resourceAppid: 'wx85d92d28575a70f4',
      resourceEnv: 'cloud1-1gsyt78b92c539ef'
    });
    cloud.init().then(() => {
      return cloud.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getUserInfo'
        }
      });
    }).then(res => {
      if (res.result && res.result.success) {
        const username = res.result.data.username || '我';
        
        // 创建用户数据，使用最新的分数
    const userRankData = {
      name: username,
      faction: this.data.userFaction,
          score: userScore,  // 使用最新的分数
      isCurrentUser: true
    };
    
    // 将用户加入排行榜并重新排序
    topPerformers.push(userRankData);
    topPerformers.sort((a, b) => b.score - a.score);
    
    // 查找用户排名
    let userRank = 0;
    for (let i = 0; i < topPerformers.length; i++) {
      if (topPerformers[i].isCurrentUser) {
        userRank = i + 1;
        break;
      }
    }
    
    // 限制只显示前10名
    topPerformers = topPerformers.slice(0, 10);
    
    // 计算平均正确率（使用位运算取整）
    const avgCorrectRate = this.data.answeredQuestions > 0 ? 
      ((this.data.correctAnswers / this.data.answeredQuestions * 100) | 0) : 0;
    
    // 更新结果数据
    this.setData({
      currentState: 'result',
      winnerFaction: winnerFaction,
      topPerformers: topPerformers,
      totalAnswers: this.data.towerCount + this.data.rainCount,
      avgCorrectRate: avgCorrectRate,
      showAnswers: true,  // 默认展开参考答案
          userRanking: userRank,
          userScore: userScore,  // 确保使用最新的分数
          userReward: totalReward,
          questions: processedQuestions  // 使用处理后的题目数据
        });
        
        // 更新用户的树木奖励
        this.updateUserReward(totalReward);
        
        wx.hideLoading();
      } else {
        console.error('获取用户信息失败:', res);
        // 使用默认值继续
        this.useLocalResultsWithDefaultName('我');
      }
    }).catch(err => {
      console.error('调用getUserInfo云函数失败:', err);
      // 使用默认值继续
      this.useLocalResultsWithDefaultName('我');
    });
  },

  // 使用默认用户名的结果处理
  useLocalResultsWithDefaultName(defaultName) {
    const userRankData = {
      name: defaultName,
      faction: this.data.userFaction,
      score: userScore,
      isCurrentUser: true
    };
    
    topPerformers.push(userRankData);
    topPerformers.sort((a, b) => b.score - a.score);
    
    let userRank = 0;
    for (let i = 0; i < topPerformers.length; i++) {
      if (topPerformers[i].isCurrentUser) {
        userRank = i + 1;
        break;
      }
    }
    
    topPerformers = topPerformers.slice(0, 10);
    
    const avgCorrectRate = this.data.answeredQuestions > 0 ? 
      ((this.data.correctAnswers / this.data.answeredQuestions * 100) | 0) : 0;
    
    this.setData({
      currentState: 'result',
      winnerFaction: winnerFaction,
      topPerformers: topPerformers,
      totalAnswers: this.data.towerCount + this.data.rainCount,
      avgCorrectRate: avgCorrectRate,
      showAnswers: true,
      userRanking: userRank,
      userScore: userScore,
      userReward: totalReward
    });
    
    this.updateUserReward(totalReward);
    
    wx.hideLoading();
  },

  /**
   * 进入下一题
   */
  goToNextQuestion() {
    // 获取当前的问题索引和总题目数
    let { currentQuestionIndex, allQuestions } = this.data;
    
    // 判断是否已完成所有题目
    if (currentQuestionIndex >= 14) { // 0-indexed，所以14表示第15题
      console.log('所有题目已完成，等待PK结束');

      // 显示等待状态
      this.setData({
        currentState: 'waiting',
        statusText: '答题完成，等待PK结束...'
      });

      // 检查PK是否已结束
      this.checkIfPkEnded();
      return;
    }
    
    // 进入下一题
    const nextQuestionIndex = currentQuestionIndex + 1;
    
    // 确定下一题的类型
    let nextQuestionType;
    if (nextQuestionIndex < 5) {
      nextQuestionType = 'single';
    } else if (nextQuestionIndex < 10) {
      nextQuestionType = 'multiple';
    } else {
      nextQuestionType = 'fill';
    }
    
    // 获取下一题的题目对象
    const typeIndex = nextQuestionType === 'single' ? nextQuestionIndex : 
                      nextQuestionType === 'multiple' ? nextQuestionIndex - 5 : 
                      nextQuestionIndex - 10;
    
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

    // 开始新一题的计时
    this.startTimer();
  },
  
  /**
   * 更新用户奖励
   */
  async updateUserReward(reward) {
    // 获取今天的日期字符串
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

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
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    
    // 清除PK时间检查定时器
    if (this.pkTimeChecker) {
      clearInterval(this.pkTimeChecker);
    }
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
  }
});







