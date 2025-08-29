// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取今日的questionSetId
function getTodayQuestionSetId() {
  const today = new Date();
  return today.toISOString().split('T')[0].replace(/-/g, '');
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
          userCount: 51,
          correctCount: 0,
          totalScore: 0
        },
        {
          name: 'rain',
          userCount: 52,
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
  } catch (error) {
    console.error('创建每日PK会话失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}