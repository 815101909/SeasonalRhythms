// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取中国时区的今日日期
function getTodayDateString() {
  const now = new Date();
  // 转换为中国时区（UTC+8）
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return chinaTime.toISOString().split('T')[0];
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('=== getRankings云函数开始执行 ===');
  console.log('接收到的参数:', event);
  
  const { action, date } = event;
  const wxContext = cloud.getWXContext();
  const currentUserOpenId = wxContext.FROM_OPENID || wxContext.OPENID;
  
  try {
    if (action === 'getTodayRanking') {
      const targetDate = date || getTodayDateString();
      
      console.log('获取排行榜，目标日期：', targetDate);
      console.log('查询条件:', { date: targetDate, isCompleted: true });
      
      // 查询当日所有完成的PK记录
      const result = await db.collection('pk_participation')
        .where({
          date: targetDate,
          isCompleted: true
        })
        .orderBy('score', 'desc')
        .orderBy('completedAt', 'asc') // 同分数时按完成时间排序
        .limit(100) // 限制返回前100名
        .get();
      
      console.log(`找到 ${result.data.length} 条记录`);
      
      // 如果没有找到记录，显示数据库中实际存在的日期
      if (result.data.length === 0) {
        console.log('没有找到记录，检查数据库中的日期...');
        const allRecords = await db.collection('pk_participation')
          .where({ isCompleted: true })
          .field({ date: true, username: true })
          .limit(5)
          .get();
        console.log('数据库中的记录日期:', allRecords.data.map(item => ({ date: item.date, username: item.username })));
      }
      
      // 处理排行榜数据
      const rankings = result.data.map((item, index) => ({
        userId: item.openid,
        username: item.username || '匿名用户',
        faction: item.userFaction || 'tower',
        score: item.score || 0,
        correctAnswers: item.correctAnswers || 0,
        totalAnswers: item.totalAnswers || 15,
        completedAt: item.completedAt,
        rank: index + 1,
        isVirtual: item.isVirtual || false,
        isCurrentUser: item.openid === currentUserOpenId  // 直接在云函数中标记当前用户
      }));
      
      // 统计阵营信息
      const towerCount = rankings.filter(item => item.faction === 'tower').length;
      const rainCount = rankings.filter(item => item.faction === 'rain').length;
      const totalParticipants = rankings.length;
      
      return {
        success: true,
        data: {
          rankings: rankings,
          totalParticipants: totalParticipants,
          towerCount: towerCount,
          rainCount: rainCount,
          date: targetDate
        },
        message: `成功获取 ${targetDate} 的排行榜数据`
      };
    }
    
    if (action === 'getUserRank') {
      const targetDate = date || getTodayDateString();
      const userOpenId = context.OPENID;
      
      console.log('获取用户排名，用户：', userOpenId, '日期：', targetDate);
      
      // 查找用户记录
      const userResult = await db.collection('pk_participation')
        .where({
          date: targetDate,
          openid: userOpenId,
          isCompleted: true
        })
        .get();
        
      if (userResult.data.length === 0) {
        return {
          success: false,
          message: '用户未完成今日PK'
        };
      }
      
      const userRecord = userResult.data[0];
      
      // 计算用户排名（查询分数更高的用户数量）
      const higherScoreResult = await db.collection('pk_participation')
        .where({
          date: targetDate,
          isCompleted: true,
          score: db.command.gt(userRecord.score)
        })
        .count();
        
      // 查询同分数但完成时间更早的用户数量
      const sameScoreEarlierResult = await db.collection('pk_participation')
        .where({
          date: targetDate,
          isCompleted: true,
          score: userRecord.score,
          completedAt: db.command.lt(userRecord.completedAt)
        })
        .count();
        
      const userRank = higherScoreResult.total + sameScoreEarlierResult.total + 1;
      
      return {
        success: true,
        data: {
          userRecord: {
            username: userRecord.username || '我',
            faction: userRecord.userFaction || 'tower',
            score: userRecord.score || 0,
            correctAnswers: userRecord.correctAnswers || 0,
            totalAnswers: userRecord.totalAnswers || 15,
            completedAt: userRecord.completedAt
          },
          rank: userRank
        },
        message: `用户排名第 ${userRank} 位`
      };
    }
    
    return {
      success: false,
      message: '未知操作类型'
    };
    
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return {
      success: false,
      error: error.message,
      message: '获取排行榜数据失败'
    };
  }
}
