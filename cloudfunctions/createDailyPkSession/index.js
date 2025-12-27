// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取今日的questionSetId（中国时区）
function getTodayQuestionSetId() {
  const now = new Date();
  // 转换为中国时区（UTC+8）
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return chinaTime.toISOString().split('T')[0].replace(/-/g, '');
}

// 生成虚拟用户数据
function generateVirtualUsers(date, questionSetId) {
  const virtualNames = [
    '星河折光', 'Aurorabyte', '影ノ森', 'Lunnaya Ten', '艾樱',
    '墨青逐月', 'Vientooooo', 'Neonharbor', '霜落千山', 'Pixelwarden',
    '北巷旧灯', 'Resonanzwolf', '하늘꽃', 'Crimson', '沉水浮灯',
    'SolitarioZzzz', 'Sakura', '李清照', '浣星归途', 'Sombrasvivas',
    'Skywardcircuit', '夏虫语冰', '晨之叶', '波間の灯', 'Arcticrider',
    '琉璃者长风', 'Prismanova', '猎隼之飞', '星屿', 'Midnighter',
    'Solaramox', '花迷途', 'xiao森林代码', 'Digital', '银河入梦者',
    'aeren', '醉卧流光里', 'Ummmmmm', '浅蓝未眠', 'Kiri雾中',
    'Statics', '迷雾岛旅人', '木木', '知秋未晚', 'Polar',
    '读风者', 'Blüten', '暗夜行舟', 'Sparrow', '纸鸢勇寄海'
  ];

  const factions = ['tower', 'rain'];
  const virtualUsers = [];
  
  // 生成50个虚拟用户
  for (let i = 0; i < 50; i++) {
    const score = Math.floor(Math.random() * 11); // 0-10分
    const correctAnswers = Math.floor(score * 0.7 + Math.random() * score * 0.3); // 正确答案数
    const faction = factions[i % 2]; // 阵营平均分配
    const name = virtualNames[i] || `虚拟用户${i + 1}`; // 如果名字不够用默认名字
    
    // 生成随机完成时间（今天的某个时间）
    const baseTime = new Date(date + 'T00:00:00.000Z').getTime();
    const randomOffset = Math.random() * 24 * 60 * 60 * 1000; // 24小时内随机时间
    const completedAt = new Date(baseTime + randomOffset);
    
    virtualUsers.push({
      openid: `virtual_${date}_${i.toString().padStart(3, '0')}`, // 虚拟openid
      date: date,
      questionSetId: questionSetId,
      score: score,
      correctAnswers: correctAnswers,
      totalAnswers: 15,
      completedAt: completedAt,
      isCompleted: true,
      isVirtual: true, // 标识虚拟用户
      username: name,
      userFaction: faction,
      createdAt: new Date()
    });
  }
  
  return virtualUsers;
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const questionSetId = getTodayQuestionSetId();
    
    // 检查今天是否已经创建过会话
    const existingSession = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .get();

    if (existingSession.data.length > 0) {
      return {
        success: true,
        data: existingSession.data[0],
        message: '今日PK会话已存在'
      };
    }

    // 创建新的PK会话
    const newSession = {
      questionSetId: questionSetId,
      status: 'waiting',
      currentQuestionIndex: 0,
      factions: [
        {
          name: 'tower',
          userCount: 25,
          correctCount: 0,
          totalScore: 0
        },
        {
          name: 'rain',
          userCount: 25,
          correctCount: 0,
          totalScore: 0
        }
      ],
      createdAt: db.serverDate(),
      date: (() => {
        const now = new Date();
        // 转换为中国时区（UTC+8）
        const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        return chinaTime.toISOString().split('T')[0];
      })()
    };

    const createResult = await db.collection('pk_sessions').add({
      data: newSession
    });

    // 创建会话成功后，生成并插入虚拟用户数据
    const today = newSession.date;
    
    // 检查今天是否已经有虚拟用户数据
    const existingVirtualUsers = await db.collection('pk_participation')
      .where({
        date: today,
        isVirtual: true
      })
      .count();
    
    if (existingVirtualUsers.total === 0) {
      // 生成50个虚拟用户
      const virtualUsers = generateVirtualUsers(today, questionSetId);
      
      // 批量插入虚拟用户数据（每次最多20个）
      const batchSize = 20;
      const insertResults = [];
      
      for (let i = 0; i < virtualUsers.length; i += batchSize) {
        const batch = virtualUsers.slice(i, i + batchSize);
        try {
          const batchResult = await db.collection('pk_participation').add({
            data: batch
          });
          insertResults.push(batchResult);
        } catch (batchError) {
          console.error(`批量插入虚拟用户失败 (batch ${Math.floor(i/batchSize) + 1}):`, batchError);
        }
      }
      
      console.log(`成功为 ${today} 创建 ${virtualUsers.length} 个虚拟用户`);
    }

    return {
      success: true,
      data: {
        session: newSession,
        sessionId: createResult._id
      },
      message: '今日PK会话创建成功，虚拟用户已添加'
    };
    
  } catch (error) {
    console.error('创建每日PK会话失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}