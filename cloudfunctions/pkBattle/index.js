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

/**
 * 获取昨日PK排行榜
 */
async function getPkRanking(event, context) {
  const db = cloud.database();
  const _ = db.command;
  
  try {
    // 获取中国时区的昨天日期
    const chinaDate = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
    const yesterday = new Date(chinaDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log('查询日期:', yesterdayStr);

    // 1. 从pk_participation获取昨天的完成记录并按分数排序
    const { data: pkRecords } = await db.collection('pk_participation')
      .where({
        date: yesterdayStr,
        isCompleted: true
      })
      .orderBy('score', 'desc')
      .get();

    console.log('获取到的PK记录:', pkRecords);

    if (!pkRecords || pkRecords.length === 0) {
      console.log('没有找到PK记录');
      return {
        success: true,
        data: {
          winnerFaction: 'rain',
          topThree: []
        }
      };
    }

    // 2. 获取用户信息
    const userOpenids = pkRecords.map(r => r.openid);
    console.log('查询的用户openids:', userOpenids);

    const { data: users } = await db.collection('xsj_users')
      .where({
        openid: _.in(userOpenids)
      })
      .get();

    console.log('获取到的用户信息:', users);

    // 创建用户信息映射
    const userMap = {};
    users.forEach(user => {
      userMap[user.openid] = user;
    });

    // 3. 统计阵营分数
    let towerScore = 0;
    let rainScore = 0;

    pkRecords.forEach(record => {
      const user = userMap[record.openid];
      if (user) {
        if (user.faction === 'tower') {
          towerScore += record.score || 0;
        } else {
          rainScore += record.score || 0;
        }
      }
    });

    // 4. 获取前三名数据
    const topThree = pkRecords.slice(0, 3).map(record => {
      const user = userMap[record.openid] || {};
      return {
        name: user.username || '匿名用户',
        score: record.score || 0,
        faction: user.faction || 'rain'
      };
    });

    console.log('处理后的前三名数据:', topThree);

    return {
      success: true,
      data: {
        winnerFaction: towerScore > rainScore ? 'tower' : 'rain',
        topThree
      }
    };

  } catch (error) {
    console.error('获取排行榜数据失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 保存用户阵营到xsj_users表
async function saveUserFaction(data, context) {
  const { userFaction } = data;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;

  console.log('saveUserFaction 被调用，openid:', openid, 'userFaction:', userFaction);

  try {
    // 验证阵营参数
    if (!userFaction || (userFaction !== 'tower' && userFaction !== 'rain')) {
      return {
        success: false,
        error: '无效的阵营选择'
      };
    }

    // 查询用户是否存在
    const userResult = await db.collection('xsj_users')
      .where({ openid: openid })
      .get();

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const user = userResult.data[0];

    // 检查用户是否已经选择过阵营
    if (user.faction && user.faction !== '') {
      return {
        success: false,
        error: '用户已选择阵营，不可更改'
      };
    }

    // 更新用户阵营
    await db.collection('xsj_users')
      .doc(user._id)
      .update({
        data: {
          faction: userFaction,
          update_time: db.serverDate()
        }
      });

    console.log('用户阵营保存成功:', userFaction);

    return {
      success: true,
      data: {
        faction: userFaction
      }
    };

  } catch (error) {
    console.error('保存用户阵营失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      // 加入PK会话
      case 'joinPkSession':
        return await joinPkSession(data);

      // 获取PK状态
      case 'getPkStatus':
        return await getPkStatus(data);

      // 提交PK答案
      case 'submitPkAnswer':
        return await submitPkAnswer(data);

      // 更新PK状态
      case 'updatePkStatus':
        return await updatePkStatus(data);

      // 完成PK
      case 'completePk':
        return await completePk(data, context);

      // 获取用户阵营
      case 'getUserFaction':
        return await getUserFaction(data);

      // 检查用户PK完成状态
      case 'checkPkStatus':
        return await checkPkStatus(data, context);

      // 检查用户PK参与状态
      case 'checkUserPkParticipation':
        return await checkUserPkParticipation(data);

      // 保存用户阵营
      case 'saveUserFaction':
        return await saveUserFaction(data, context);

      case 'getQuestions':
        // 获取PK题目或训练题目
        const { date, category, isTraining } = data;
        let questions;
        
        // 获取当前中国时区的时间戳
        const now = new Date();
        const chinaTime = now.getTime() + (8 * 60 * 60 * 1000);
        const todayStart = new Date(new Date(chinaTime).setHours(0, 0, 0, 0)).getTime();
        const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
        
        // 训练模式
        if (isTraining) {
          const query = {
            isActive: true,
            category: category,
            PublishTime: {
              $gte: yesterdayStart,
              $lt: todayStart + 24 * 60 * 60 * 1000
            }
          };
          
          questions = await db.collection('pk_questions')
            .where(query)
            .orderBy('PublishTime', 'desc')  // 优先使用今天发布的题目
            .orderBy('type', 'asc')
            .get();

          console.log('获取到的训练题目:', questions.data);

          if (!Array.isArray(questions.data)) {
            console.error('训练题目数据不是数组:', questions.data);
            return {
              success: false,
              error: '题目数据格式错误'
            };
          }

          // 按题目类型分类并随机选择5题
          const questionsByType = {
            single: randomSelect(questions.data.filter(q => q.type === "1") || [], 5),
            multiple: randomSelect(questions.data.filter(q => q.type === "2") || [], 5),
            fill: randomSelect(questions.data.filter(q => q.type === "3") || [], 5)
          };

          console.log('分类后的题目:', questionsByType);

          return {
            success: true,
            data: questionsByType
          };
        }
        
        // PK赛模式
        if (!date) {
          return {
            success: false,
            error: 'PK赛模式需要提供date参数'
          }
        }

        console.log('开始获取PK题目，日期:', date);

        try {
          // 先获取今天的题目
          const todayQuery = {
            isActive: true,
            PublishTime: {
              $gte: todayStart,
              $lt: todayStart + 24 * 60 * 60 * 1000
            }
          };

          const todayCityQuestions = await db.collection('pk_questions')
            .where({
              ...todayQuery,
              category: 'city'
            })
            .get();

          const todaySeasonQuestions = await db.collection('pk_questions')
            .where({
              ...todayQuery,
              category: 'season'
            })
            .get();

          // 如果今天的题目不够，获取昨天的题目
          const yesterdayQuery = {
            isActive: true,
            PublishTime: {
              $gte: yesterdayStart,
              $lt: todayStart
            }
          };

          const yesterdayCityQuestions = await db.collection('pk_questions')
            .where({
              ...yesterdayQuery,
              category: 'city'
            })
            .get();

          const yesterdaySeasonQuestions = await db.collection('pk_questions')
            .where({
              ...yesterdayQuery,
              category: 'season'
            })
            .get();

          // 合并今天和昨天的题目
          const cityData = [
            ...(Array.isArray(todayCityQuestions.data) ? todayCityQuestions.data : []),
            ...(Array.isArray(yesterdayCityQuestions.data) ? yesterdayCityQuestions.data : [])
          ];

          const seasonData = [
            ...(Array.isArray(todaySeasonQuestions.data) ? todaySeasonQuestions.data : []),
            ...(Array.isArray(yesterdaySeasonQuestions.data) ? yesterdaySeasonQuestions.data : [])
          ];

          console.log('题目数量统计:', {
            today: {
              city: todayCityQuestions.data ? todayCityQuestions.data.length : 0,
              season: todaySeasonQuestions.data ? todaySeasonQuestions.data.length : 0
            },
            yesterday: {
              city: yesterdayCityQuestions.data ? yesterdayCityQuestions.data.length : 0,
              season: yesterdaySeasonQuestions.data ? yesterdaySeasonQuestions.data.length : 0
            },
            total: {
              city: cityData.length,
              season: seasonData.length
            }
          });

          if (cityData.length === 0 && seasonData.length === 0) {
            console.error('没有找到可用的题目');
            return {
              success: false,
              error: '没有可用的题目'
            };
          }

          // 检查每种类型的题目是否足够
          const cityQuestionsByType = {
            "1": cityData.filter(q => q.type === "1"),
            "2": cityData.filter(q => q.type === "2"),
            "3": cityData.filter(q => q.type === "3")
          };

          const seasonQuestionsByType = {
            "1": seasonData.filter(q => q.type === "1"),
            "2": seasonData.filter(q => q.type === "2"),
            "3": seasonData.filter(q => q.type === "3")
          };

          // 检查题目数量是否满足要求
          const requiredCounts = {
            city: { "1": 3, "2": 3, "3": 3 },
            season: { "1": 2, "2": 2, "3": 2 }
          };

          for (const type of ["1", "2", "3"]) {
            if (cityQuestionsByType[type].length < requiredCounts.city[type]) {
              console.error(`城市题目类型 ${type} 数量不足，需要 ${requiredCounts.city[type]} 题，实际只有 ${cityQuestionsByType[type].length} 题`);
              return {
                success: false,
                error: `城市题目数量不足，请联系管理员补充题目`
              };
            }
            if (seasonQuestionsByType[type].length < requiredCounts.season[type]) {
              console.error(`时节题目类型 ${type} 数量不足，需要 ${requiredCounts.season[type]} 题，实际只有 ${seasonQuestionsByType[type].length} 题`);
              return {
                success: false,
                error: `时节题目数量不足，请联系管理员补充题目`
              };
            }
          }

          // 随机选择题目
          const pkQuestions = {
            single: [
              ...randomSelect(cityQuestionsByType["1"], 3),
              ...randomSelect(seasonQuestionsByType["1"], 2)
            ],
            multiple: [
              ...randomSelect(cityQuestionsByType["2"], 3),
              ...randomSelect(seasonQuestionsByType["2"], 2)
            ],
            fill: [
              ...randomSelect(cityQuestionsByType["3"], 3),
              ...randomSelect(seasonQuestionsByType["3"], 2)
            ]
          };

          console.log('生成的PK题目:', {
            single: pkQuestions.single.length,
            multiple: pkQuestions.multiple.length,
            fill: pkQuestions.fill.length
          });

          return {
            success: true,
            data: pkQuestions
          };
        } catch (error) {
          console.error('获取PK题目时出错:', error);
          return {
            success: false,
            error: '获取题目失败: ' + error.message
          };
        }

      case 'submitAnswer': {
        // 提交答案
        const { userId, questionId, answer, timeUsed, factionId } = data
        
        // 验证答案
        const question = await db.collection('pk_questions')
          .where({
            _id: questionId
          })
          .get()
        
        if (question.data.length === 0) {
          return {
            success: false,
            error: '题目不存在'
          }
        }

        const isCorrect = question.data[0].correctAnswer === answer
        const answerScore = calculateScore(isCorrect, timeUsed)

        // 记录答题
        await db.collection('pk_answers').add({
          data: {
            userId,
            questionId,
            answer,
            isCorrect,
            score: answerScore,
            timeUsed,
            factionId,
            createTime: db.serverDate()
          }
        })

        // 更新用户和阵营分数
        await updateScores(userId, factionId, answerScore)

        return {
          success: true,
          data: {
            isCorrect,
            score: answerScore,
            correctAnswer: question.data[0].correctAnswer
          }
        }
      }

      case 'getRanking': {
        // 获取排行榜
        const { type } = data // 'personal' 或 'faction'
        let rankingData

        if (type === 'personal') {
          rankingData = await db.collection('pk_scores')
            .orderBy('totalScore', 'desc')
            .limit(50)
            .get()
        } else {
          rankingData = await db.collection('faction_scores')
            .orderBy('totalScore', 'desc')
            .get()
        }

        return {
          success: true,
          data: rankingData.data
        }
      }

      case 'distributeReward': {
        // 发放奖励
        const { userId: rewardUserId, ranking: userRanking, score: userScore } = data
        const rewardAmount = calculateReward(userRanking, userScore)

        await db.collection('pk_rewards').add({
          data: {
            userId: rewardUserId,
            rewardAmount,
            ranking: userRanking,
            score: userScore,
            createTime: db.serverDate()
          }
        })

        return {
          success: true,
          data: {
            rewardAmount
          }
        }
      }

      case 'getPkRanking':
        return await getPkRanking(event, context);

      case 'createDailyPkSession':
        return await createDailyPkSession();

      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('PK Battle云函数错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 计算得分
function calculateScore(isCorrect, timeUsed) {
  if (!isCorrect) return 0
  // 基础分100，根据答题时间递减，最低60分
  return Math.max(100 - Math.floor(timeUsed / 1000) * 2, 60)
}

// 计算奖励
function calculateReward(ranking, score) {
  // 根据排名和得分计算奖励
  let baseReward = 100
  if (ranking <= 10) baseReward = 500
  else if (ranking <= 50) baseReward = 300
  else if (ranking <= 100) baseReward = 200

  // 根据得分增加奖励
  const scoreBonus = Math.floor(score / 100) * 50

  return baseReward + scoreBonus
}

// 更新分数
async function updateScores(userId, factionId, score) {
  const db = cloud.database()
  
  // 更新用户总分
  await db.collection('pk_scores')
    .where({
      userId: userId
    })
    .update({
      data: {
        totalScore: db.command.inc(score),
        updateTime: db.serverDate()
      }
    })

  // 更新阵营总分
  await db.collection('faction_scores')
    .where({
      factionId: factionId
    })
    .update({
      data: {
        totalScore: db.command.inc(score),
        updateTime: db.serverDate()
      }
    })
} 

// 随机选择指定数量的题目
function randomSelect(array, count) {
  if (!Array.isArray(array)) {
    console.error('randomSelect: 输入不是数组', array);
    return [];
  }

  if (array.length <= count) {
    return array;
  }

  const result = [];
  const used = new Set();

  while (result.length < count && used.size < array.length) {
    const index = Math.floor(Math.random() * array.length);
    if (!used.has(index)) {
      used.add(index);
      result.push(array[index]);
    }
  }

  return result;
}

// PK会话管理函数

// 加入PK会话
async function joinPkSession(data) {
  const { userFaction } = data;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;
  const questionSetId = getTodayQuestionSetId();

  try {
    // 检查用户是否已经参与过今天的PK
    const participationCheck = await db.collection('pk_participation')
      .where({
        openid: openid,
        questionSetId: questionSetId
      })
      .get();

    if (participationCheck.data.length > 0) {
      // 用户已经参与过，需要获取会话信息并返回
      console.log('用户已参与过PK，获取现有会话信息');

      // 查找今日的PK会话
      const sessionQuery = await db.collection('pk_sessions')
        .where({
          questionSetId: questionSetId
        })
        .get();

      if (sessionQuery.data.length > 0) {
        const session = sessionQuery.data[0];
        return {
          success: true,
          data: {
            sessionId: session._id,
            questionSetId: questionSetId,
            status: session.status,
            currentQuestionIndex: session.currentQuestionIndex,
            factions: session.factions || [
              { name: 'tower', userCount: 0, correctCount: 0, totalScore: 0 },
              { name: 'rain', userCount: 0, correctCount: 0, totalScore: 0 }
            ],
            participation: participationCheck.data[0]
          },
          message: '已存在参与记录'
        };
      }
    }

    // 获取用户的阵营信息
    const userInfo = await db.collection('xsj_users')
      .where({ openid: openid })
      .get();

    if (!userInfo.data.length || !userInfo.data[0].faction) {
      return {
        success: false,
        error: '用户未选择阵营'
      };
    }

    const faction = userInfo.data[0].faction;

    // 创建新的参与记录
    const participationResult = await db.collection('pk_participation').add({
      data: {
        openid: openid,
        questionSetId: questionSetId,
        userFaction: faction,
        date: new Date().toISOString().split('T')[0],
        isCompleted: false,
        createdAt: db.serverDate(),
        score: 0,
        correctAnswers: 0,
        totalAnswers: 0
      }
    });

    // 查找今日的PK会话
    const sessionQuery = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .get();

    let session;

    if (sessionQuery.data.length === 0) {
      // 创建新的PK会话
      const newSession = {
        questionSetId: questionSetId,
        status: 'waiting',
        currentQuestionIndex: 0,
        factions: [
          {
            name: 'tower',
            userCount: 0,
            correctCount: 0,
            totalScore: 0
          },
          {
            name: 'rain',
            userCount: 0,
            correctCount: 0,
            totalScore: 0
          }
        ],
        createdAt: db.serverDate()
      };

      const createResult = await db.collection('pk_sessions').add({
        data: newSession
      });

      session = { _id: createResult._id, ...newSession };
    } else {
      session = sessionQuery.data[0];
    }

    // 更新用户所在阵营的人数
    const factionIndex = faction === 'tower' ? 0 : 1;
    const updateData = {};
    updateData[`factions.${factionIndex}.userCount`] = db.command.inc(1);

    await db.collection('pk_sessions')
      .doc(session._id)
      .update({
        data: updateData
      });

    return {
      success: true,
      data: {
        sessionId: session._id,
        questionSetId: questionSetId,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        factions: session.factions,
        participation: participationResult
      }
    };

  } catch (error) {
    console.error('加入PK会话失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 获取PK状态
async function getPkStatus(data) {
  const { questionSetId } = data;

  try {
    const sessionQuery = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .get();

    if (sessionQuery.data.length === 0) {
      return {
        success: false,
        error: 'PK会话不存在'
      };
    }

    const session = sessionQuery.data[0];

    return {
      success: true,
      data: {
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        factions: session.factions
      }
    };

  } catch (error) {
    console.error('获取PK状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 提交PK答案
async function submitPkAnswer(data) {
  const { questionSetId, userFaction, questionIndex, isCorrect, score } = data;

  try {
    // 严格检查阵营类型
    let factionIndex;
    if (userFaction === 'tower') {
      factionIndex = 0;
    } else if (userFaction === 'rain') {
      factionIndex = 1;
    } else {
      console.error('无效的阵营类型:', userFaction);
      return {
        success: false,
        error: '无效的阵营类型'
      };
    }

    console.log('提交答案 - 阵营信息:', {
      userFaction,
      factionIndex,
      isCorrect,
      score
    });

    // 更新阵营统计
    const updateData = {};

    if (isCorrect) {
      updateData[`factions.${factionIndex}.correctCount`] = db.command.inc(1);
    }
    updateData[`factions.${factionIndex}.totalScore`] = db.command.inc(score);

    // 获取更新前的数据
    const sessionBefore = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .get();

    console.log('更新前的会话数据:', sessionBefore.data[0]);

    // 执行更新
    const updateResult = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .update({
        data: updateData
      });

    console.log('更新结果:', updateResult);

    // 获取更新后的数据
    const sessionAfter = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .get();

    console.log('更新后的会话数据:', sessionAfter.data[0]);

    return {
      success: true,
      data: {
        message: '答案提交成功',
        factions: sessionAfter.data[0].factions
      }
    };

  } catch (error) {
    console.error('提交PK答案失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 检查并更新PK状态
async function updatePkStatus(data) {
  const { questionSetId } = data;

  try {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    console.log('当前时间检查:', { hour, minute, questionSetId });

    // 检查是否在PK时间内 (19:30-19:45)
    // 为了测试，可以手动设置状态
    const isPkTime = true; // 设置为true测试ongoing状态，false测试waiting状态
    let newStatus = 'waiting';

    if (isPkTime) {
      newStatus = 'ongoing'; // 设置为进行中状态
      console.log('PK进行中');
    } else {
      console.log('PK未开始');
    }

    console.log('更新PK状态为:', newStatus);

    // 更新会话状态
    const updateResult = await db.collection('pk_sessions')
      .where({
        questionSetId: questionSetId
      })
      .update({
        data: {
          status: newStatus,
          updatedAt: db.serverDate()
        }
      });

    console.log('数据库更新结果:', updateResult);

    return {
      success: true,
      data: {
        status: newStatus,
        isPkTime: isPkTime,
        currentTime: { hour, minute },
        updateResult: updateResult
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

// 完成PK的函数
async function completePk(data, context) {
  const { questionSetId, finalScore, correctAnswers, totalAnswers } = data;

  // 直接从云函数上下文获取用户openid
  const openid = context.OPENID;

  try {
    console.log('completePk 接收到的参数:', {
      openid,
      questionSetId,
      finalScore,
      correctAnswers,
      totalAnswers
    });

    // 先查询是否存在匹配的记录
    const queryResult = await db.collection('pk_participation')
      .where({
        openid: openid,
        questionSetId: questionSetId
      })
      .get();

    console.log('查询到的匹配记录数量:', queryResult.data.length);
    if (queryResult.data.length > 0) {
      console.log('匹配的记录:', queryResult.data[0]);
    }

    // 更新参与记录
    const result = await db.collection('pk_participation')
      .where({
        openid: openid,
        questionSetId: questionSetId
      })
      .update({
        data: {
          isCompleted: true,
          score: finalScore,
          correctAnswers: correctAnswers,
          totalAnswers: totalAnswers,
          completedAt: db.serverDate()
        }
      });

    console.log('更新结果:', result);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('完成PK更新失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 检查用户PK完成状态的函数
async function checkPkStatus(data, context) {
  const { questionSetId } = data;
  const openid = context.OPENID;

  try {
    console.log('检查PK状态，参数:', { openid, questionSetId });

    // 查询用户的PK参与记录
    const result = await db.collection('pk_participation')
      .where({
        openid: openid,
        questionSetId: questionSetId
      })
      .get();

    console.log('查询到的PK记录:', result.data);

    if (result.data.length > 0) {
      const record = result.data[0];
      return {
        success: true,
        data: {
          hasParticipated: true,
          isCompleted: record.isCompleted,
          score: record.score || 0,
          correctAnswers: record.correctAnswers || 0,
          totalAnswers: record.totalAnswers || 0
        }
      };
    } else {
      return {
        success: true,
        data: {
          hasParticipated: false,
          isCompleted: false
        }
      };
    }
  } catch (error) {
    console.error('检查PK状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 获取用户阵营的函数
async function getUserFaction(data) {
  // 优先使用FROM_OPENID（跨小程序调用时的openid），如果没有则使用OPENID
  const wxContext = cloud.getWXContext();
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;

  console.log('getUserFaction 被调用，openid:', openid);

  try {
    // 查询用户的PK参与记录，获取阵营信息
    const result = await db.collection('pk_participation')
      .where({
        openid: openid
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    console.log('数据库查询结果:', result);

    if (result.data.length > 0) {
      console.log('找到用户阵营信息:', result.data[0].userFaction);
      return {
        success: true,
        data: {
          userFaction: result.data[0].userFaction
        }
      };
    } else {
      console.log('未找到用户阵营信息');
      return {
        success: false,
        error: '未找到用户阵营信息'
      };
    }
  } catch (error) {
    console.error('获取用户阵营失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 检查用户PK参与状态的函数
async function checkUserPkParticipation(data) {
  // 优先使用FROM_OPENID（跨小程序调用时的openid），如果没有则使用OPENID
  const wxContext = cloud.getWXContext();
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;
  const { date } = data;

  console.log('checkUserPkParticipation 被调用，openid:', openid, 'date:', date);

  try {
    // 查询用户在指定日期的PK参与记录
    const result = await db.collection('pk_participation')
      .where({
        openid: openid,
        date: date
      })
      .get();

    console.log('PK参与状态查询结果:', result);

    if (result.data.length > 0) {
      const participation = result.data[0];
      console.log('找到PK参与记录:', participation);
      return {
        success: true,
        data: {
          hasParticipated: true,
          isCompleted: participation.isCompleted,
          userFaction: participation.userFaction,
          score: participation.score || 0,
          correctAnswers: participation.correctAnswers || 0,
          totalAnswers: participation.totalAnswers || 0
        }
      };
    } else {
      console.log('未找到PK参与记录');
      return {
        success: true,
        data: {
          hasParticipated: false,
          isCompleted: false,
          userFaction: '',
          score: 0,
          correctAnswers: 0,
          totalAnswers: 0
        }
      };
    }
  } catch (error) {
    console.error('检查PK参与状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 创建每日PK会话
async function createDailyPkSession() {
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
      date: new Date().toISOString().split('T')[0]
    };

    const createResult = await db.collection('pk_sessions').add({
      data: newSession
    });

    return {
      success: true,
      data: {
        sessionId: createResult._id,
        ...newSession
      }
    };

  } catch (error) {
    console.error('创建每日PK会话失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}