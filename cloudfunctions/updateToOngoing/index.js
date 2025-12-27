// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取今日的questionSetId（中国时区）
function getTodayQuestionSetId() {
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return chinaTime.toISOString().split('T')[0].replace(/-/g, '');
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const questionSetId = getTodayQuestionSetId();
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const day = chinaTime.getUTCDay();

    const isWeekend = (day === 6 || day === 0);

    if (!isWeekend) {
      return {
        success: false,
        error: 'PK仅在中国时区的周六日开放'
      };
    }
    
    // 查找今日的PK会话
    const sessionQuery = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .get();

    if (sessionQuery.data.length === 0) {
      return {
        success: false,
        error: '今日PK会话不存在'
      };
    }

    const session = sessionQuery.data[0];
    
    // 如果已经是ongoing或ended状态，返回错误
    if (session.status === 'ongoing') {
      return {
        success: false,
        error: 'PK已经在进行中'
      };
    }
    if (session.status === 'ended') {
      return {
        success: false,
        error: 'PK已经结束'
      };
    }

    // 更新状态为ongoing
    await db.collection('pk_sessions')
      .doc(session._id)
      .update({
        data: {
          status: 'ongoing',
          updatedAt: db.serverDate()
        }
      });

    return {
      success: true,
      data: {
        message: 'PK状态已更新为进行中'
      }
    };

  } catch (error) {
    console.error('更新PK状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 
