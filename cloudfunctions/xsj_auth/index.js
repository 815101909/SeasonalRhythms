// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成唯一用户编号
async function generateUserId() {
  const prefix = 'XZ'
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    // 生成6位随机数字
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    const userId = `${prefix}${randomNum}`
    
    // 检查是否已存在
    const existingUser = await db.collection('xsj_users').where({
      userId: userId
    }).get()
    
    if (existingUser.data.length === 0) {
      return userId
    }
    
    attempts++
  }
  
  // 如果多次尝试都重复，使用时间戳确保唯一性
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}${timestamp}`
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  
  // 统一获取openid，优先使用FROM_OPENID（跨小程序调用时的openid），如果没有则使用OPENID
  const userOpenid = wxContext.FROM_OPENID || wxContext.OPENID

  try {
    switch (action) {
      case 'login':
        // 微信一键登录
        const { userInfo: wxUserInfo } = data || {}
        
        console.log('wxContext.FROM_OPENID:', wxContext.FROM_OPENID)
        console.log('wxContext.OPENID:', wxContext.OPENID)
        console.log('最终使用的openid:', userOpenid)
        
        // 查询用户是否已存在
        const userResult = await db.collection('xsj_users').where({
          openid: userOpenid
        }).get()

        if (userResult.data.length > 0) {
          // 用户已存在，更新用户信息
          const existingUser = userResult.data[0]
          const updateData = {
            update_time: db.serverDate()
          }

          // 如果有新的用户信息则更新
          if (wxUserInfo) {
            // 登录时不更新头像，保持用户原有头像
            console.log('login - 保持原有头像，不更新')
            // updateData.avatarUrl = wxUserInfo.avatarUrl // 注释掉头像更新
          }

          await db.collection('xsj_users').doc(existingUser._id).update({
            data: updateData
          })

          // 获取更新后的用户信息
          const updatedUser = await db.collection('xsj_users').doc(existingUser._id).get()

          return {
            success: true,
            data: {
              ...updatedUser.data,
              is_new_user: false
            }
          }
        } else {
          // 创建新用户
          const userId = await generateUserId()
          const newUser = {
            openid: userOpenid,
            userId: userId, // 生成唯一用户编号
            username: '小舟用户', // 使用默认用户名，不使用微信昵称
            avatarUrl: '', // 新用户默认不设置头像，显示随机背景的"舟"字
            isVIP: true,
            memberExpireTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 试用七天会员
            consumedTrees: 0,
            timeSequenceTrees: 0,
            lantingTrees: 0,
            treeCount: 0,
            footprints: [], // 初始化空的足迹数组
            create_time: db.serverDate(),
            update_time: db.serverDate()
          }

          const result = await db.collection('xsj_users').add({
            data: newUser
          })

          // 获取新创建的用户信息
          const createdUser = await db.collection('xsj_users').doc(result._id).get()

          return {
            success: true,
            data: {
              ...createdUser.data,
              is_new_user: true
            }
          }
        }

      case 'getUserInfo':
        // 获取用户信息
        const userInfoResult = await db.collection('xsj_users').where({
          openid: userOpenid
        }).get()

        if (userInfoResult.data.length === 0) {
          return {
            success: false,
            error: '用户不存在'
          }
        }

        return {
          success: true,
          data: userInfoResult.data[0]
        }

      case 'getUserRanking':
        // 获取用户排名
        const rankingResult = await db.collection('xsj_users')
          .where({
            lantingTrees: _.gt(0)  // 只统计有树苗的用户
          })
          .orderBy('lantingTrees', 'desc')
          .get();

        // 找到当前用户的排名
        const userIndex = rankingResult.data.findIndex(user => user.openid === userOpenid);
        const userRank = userIndex + 1;  // 排名从1开始

        return {
          success: true,
          data: {
            rank: userRank,
            totalUsers: rankingResult.data.length
          }
        };

      case 'updateUserInfo':
        // 更新用户信息
        const updateData = data;
        if (!updateData) {
          return {
            success: false,
            error: '缺少更新数据'
          };
        }

        const currentUser = await db.collection('xsj_users').where({
          openid: userOpenid
        }).get();

        if (currentUser.data.length === 0) {
          return {
            success: false,
            error: '用户不存在'
          };
        }

        const userData = currentUser.data[0];
        const finalUpdateData = { ...updateData };
        
        // 如果更新consumedTrees，需要同时减少treeCount
        if (updateData.consumedTrees !== undefined) {
          const currentConsumedTrees = userData.consumedTrees || 0;
          const currentTreeCount = userData.treeCount || 0;
          const treesConsumed = updateData.consumedTrees - currentConsumedTrees;
          
          if (treesConsumed > 0) {
            // 减少相应的treeCount
            finalUpdateData.treeCount = Math.max(0, currentTreeCount - treesConsumed);
          }
        }

        // 更新用户数据
        await db.collection('xsj_users').doc(userData._id).update({
          data: {
            ...finalUpdateData,
            update_time: db.serverDate()
          }
        });

        return {
          success: true
        };

      case 'checkVip':
        // 检查会员状态
        const vipInfo = await db.collection('xsj_users').where({
          openid: userOpenid
        }).field({
          isVIP: true
        }).get()

        if (vipInfo.data.length === 0) {
          return {
            success: false,
            error: '用户不存在'
          }
        }

        return {
          success: true,
          data: {
            isVIP: vipInfo.data[0].isVIP
          }
        }

      case 'updateUserFootprints':
        // 添加用户足迹
        const footprintData = data;
        if (!footprintData) {
          return {
            success: false,
            error: '缺少足迹数据'
          }
        }

        const userForFootprint = await db.collection('xsj_users').where({
          openid: userOpenid
        }).get();

        if (userForFootprint.data.length === 0) {
          return {
            success: false,
            error: '用户不存在'
          }
        }

        // 更新用户足迹数组
        await db.collection('xsj_users').doc(userForFootprint.data[0]._id).update({
          data: {
            footprints: _.push([{
              ...footprintData,
              create_time: db.serverDate()
            }])
          }
        });

        return {
          success: true
        }

      case 'getUserFootprints':
        // 获取用户足迹
        const userWithFootprints = await db.collection('xsj_users').where({
          openid: userOpenid
        }).field({
          footprints: true
        }).get();

        if (userWithFootprints.data.length === 0) {
          return {
            success: false,
            error: '用户不存在'
          }
        }

        return {
          success: true,
          data: userWithFootprints.data[0].footprints || []
        }

      case 'clearUserFootprints':
        // 清除用户足迹
        const userForClear = await db.collection('xsj_users').where({
          openid: userOpenid
        }).get();

        if (userForClear.data.length === 0) {
          return {
            success: false,
            error: '用户不存在'
          }
        }

        await db.collection('xsj_users').doc(userForClear.data[0]._id).update({
          data: {
            footprints: []
          }
        });

        return {
          success: true
        }

      case 'getRecentActivities':
        return await getRecentActivities(event, context);

      case 'getUserActivities':
        return await getUserActivities(event, context);

      case 'recordUserActivity':
        return await recordUserActivity(event, context);

      case 'consumeTrees':
        // 消耗树苗（增量更新）
        const { treesToConsume } = data;
        if (!treesToConsume || treesToConsume <= 0) {
          return {
            success: false,
            error: '消耗树苗数量必须大于0'
          };
        }

        const userForConsume = await db.collection('xsj_users').where({
          openid: userOpenid
        }).get();

        if (userForConsume.data.length === 0) {
          return {
            success: false,
            error: '用户不存在'
          };
        }

        const userDataForConsume = userForConsume.data[0];
        const currentConsumedTrees = userDataForConsume.consumedTrees || 0;
        const currentTreeCount = userDataForConsume.treeCount || 0;
        
        // 检查是否有足够的树苗
        if (currentTreeCount < treesToConsume) {
          return {
            success: false,
            error: '树苗数量不足'
          };
        }

        // 更新用户数据：增加消耗，减少可用树苗
        await db.collection('xsj_users').doc(userDataForConsume._id).update({
          data: {
            consumedTrees: currentConsumedTrees + treesToConsume,
            treeCount: currentTreeCount - treesToConsume,
            update_time: db.serverDate()
          }
        });

        return {
          success: true,
          data: {
            newConsumedTrees: currentConsumedTrees + treesToConsume,
            newTreeCount: currentTreeCount - treesToConsume
          }
        };

      case 'generateUserIdForExistingUsers':
        // 为现有用户批量生成 userId（管理员功能）
        try {
          // 查找所有没有 userId 的用户
          const usersWithoutUserId = await db.collection('xsj_users').where({
            userId: _.exists(false)
          }).get();

          if (usersWithoutUserId.data.length === 0) {
            return {
              success: true,
              message: '所有用户都已有用户编号',
              updatedCount: 0
            };
          }

          let updatedCount = 0;
          const batchSize = 20; // 批量处理，避免超时
          
          for (let i = 0; i < Math.min(usersWithoutUserId.data.length, batchSize); i++) {
            const user = usersWithoutUserId.data[i];
            const userId = await generateUserId();
            
            await db.collection('xsj_users').doc(user._id).update({
              data: {
                userId: userId,
                update_time: db.serverDate()
              }
            });
            
            updatedCount++;
          }

          return {
            success: true,
            message: `成功为 ${updatedCount} 个用户生成用户编号`,
            updatedCount: updatedCount,
            remainingCount: Math.max(0, usersWithoutUserId.data.length - batchSize)
          };
        } catch (error) {
          console.error('批量生成用户编号失败:', error);
          return {
            success: false,
            error: error.message
          };
        }

      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('[云函数] [xsj_auth] 调用失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}


// 获取用户活动记录
async function getUserActivities(event, context) {
  try {
    const wxContext = cloud.getWXContext();
    const db = cloud.database();
    const _ = db.command;
    
    // 统一获取openid，优先使用FROM_OPENID（跨小程序调用时的openid），如果没有则使用OPENID
    const userOpenid = wxContext.FROM_OPENID || wxContext.OPENID;

    // 计算7天前的时间戳（中国时区）
    const now = new Date();
    const chinaNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(chinaNow.getTime() - (7 * 24 * 60 * 60 * 1000));
    const sevenDaysAgoUTC = new Date(sevenDaysAgo.getTime() - (8 * 60 * 60 * 1000));

    // 查询7天内的活动记录
    const activities = await db.collection('user_activities')
      .where({
        _openid: userOpenid,  // 使用统一的openid
        timestamp: _.gte(sevenDaysAgoUTC.toISOString())
      })
      .orderBy('timestamp', 'desc')
      .get();

    if (!activities.data || activities.data.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // 格式化活动时间显示
    const formattedActivities = activities.data.map(activity => {
      // 将UTC时间转换为中国时区（UTC+8）
      const utcTime = new Date(activity.timestamp);
      const chinaTime = new Date(utcTime.getTime() + (8 * 60 * 60 * 1000));
      const chinaNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));

      // 获取两个日期的年月日字符串，用于比较日期差
      const chinaDateStr = chinaTime.toISOString().split('T')[0];
      const chinaNowStr = chinaNow.toISOString().split('T')[0];
      
      // 计算日期差
      const diffTime = new Date(chinaNowStr) - new Date(chinaDateStr);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let timeDisplay;
      if (diffDays === 0) {
        // 如果是今天，显示具体时间
        const hours = chinaTime.getHours().toString().padStart(2, '0');
        const minutes = chinaTime.getMinutes().toString().padStart(2, '0');
        timeDisplay = `今天 ${hours}:${minutes}`;
      } else if (diffDays === 1) {
        // 如果是昨天，也显示具体时间
        const hours = chinaTime.getHours().toString().padStart(2, '0');
        const minutes = chinaTime.getMinutes().toString().padStart(2, '0');
        timeDisplay = `昨天 ${hours}:${minutes}`;
      } else {
        timeDisplay = `${diffDays}天前`;
      }

      return {
        _id: activity._id,
        time: timeDisplay,
        description: activity.description,
        reward: activity.reward || null,
        type: activity.type,
        faction: activity.faction
      };
    });

    return {
      success: true,
      data: formattedActivities
    };
  } catch (error) {
    console.error('获取用户活动记录失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 

// 记录用户活动
async function recordUserActivity(event, context) {
  const wxContext = cloud.getWXContext();
  const { description, type, reward } = event;
  const db = cloud.database();
  
  // 统一获取openid，优先使用FROM_OPENID（跨小程序调用时的openid），如果没有则使用OPENID
  const userOpenid = wxContext.FROM_OPENID || wxContext.OPENID;
  
  try {
    const now = new Date();
    // 添加活动记录
    await db.collection('user_activities').add({
      data: {
        _openid: userOpenid,  // 使用统一的openid
        timestamp: now.toISOString(),
        description,
        type,
        reward
      }
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('记录用户活动失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}