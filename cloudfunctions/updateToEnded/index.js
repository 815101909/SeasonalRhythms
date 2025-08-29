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
    
    // 如果已经是ended状态，返回错误
    if (session.status === 'ended') {
      return {
        success: false,
        error: 'PK已经结束'
      };
    }

    // 更新状态为ended
    await db.collection('pk_sessions')
      .doc(session._id)
      .update({
        data: {
          status: 'ended',
          updatedAt: db.serverDate()
        }
      });

    // 计算获胜阵营
    const { factions } = session;
    const winnerFaction = factions[0].totalScore > factions[1].totalScore ? 'tower' : 'rain';
    const winnerScore = Math.max(factions[0].totalScore, factions[1].totalScore);

    // 记录获胜信息
    await db.collection('pk_results').add({
      data: {
        questionSetId: questionSetId,
        date: new Date().toISOString().split('T')[0],
        winnerFaction: winnerFaction,
        winnerScore: winnerScore,
        towerScore: factions[0].totalScore,
        rainScore: factions[1].totalScore,
        createdAt: db.serverDate()
      }
    });

    // 查找获胜阵营的所有用户
    const winnerUsersRes = await db.collection('xsj_users')
      .where({
        faction: winnerFaction
      })
      .get();

    const winnerUsers = winnerUsersRes.data; // 获取数组

    // 批量更新获胜用户的兰亭树数量
    const _ = db.command;
    await db.collection('xsj_users')
      .where({
        faction: winnerFaction
      })
      .update({
        data: {
          lantingTrees: _.inc(2),
          treeCount: _.inc(2)
        }
      });

    // 批量添加活动记录，每20条一批
    const batchSize = 20; // 云开发最多一次写入20条
    for (let i = 0; i < winnerUsers.length; i += batchSize) {
      const batch = winnerUsers.slice(i, i + batchSize);

      const activityPromises = batch.map(user => {
        const now = new Date();
        return db.collection('user_activities').add({
          data: {
            _openid: user.openid, 
            description: '获得PK大赛阵营胜利奖励',
            type: 'pk_reward',
            reward: 2,
            timestamp: now.toISOString(),
            faction: winnerFaction
          }
        });
      });

      // 批量执行添加操作
      await Promise.all(activityPromises);
    }

    return {
      success: true,
      data: {
        message: 'PK状态已更新为已结束，奖励已发放',
        winnerFaction: winnerFaction,
        winnerScore: winnerScore,
        rewardedUsers: winnerUsers.length
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