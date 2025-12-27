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
        const { userInfo: wxUserInfo, referrer, phoneData, phoneCode } = data || {}
        
        // 调试信息对象
        const debugInfo = {
          steps: [],
          errors: []
        };
        
        console.log('wxContext.FROM_OPENID:', wxContext.FROM_OPENID)
        console.log('wxContext.OPENID:', wxContext.OPENID)
        console.log('最终使用的openid:', userOpenid)
        console.log('推荐码参数:', referrer)
        console.log('接收到的phoneData:', JSON.stringify(phoneData))
        console.log('接收到的phoneCode:', phoneCode)
        
        debugInfo.steps.push('start_login');
         if (phoneData) {
             debugInfo.steps.push('has_phoneData');
             console.log('phoneData type:', typeof phoneData);
             if (typeof phoneData === 'object') {
                 console.log('phoneData keys:', Object.keys(phoneData));
             } else {
                 console.log('phoneData value:', phoneData);
             }
         }
         if (phoneCode) debugInfo.steps.push('has_phoneCode');
         
         // 获取手机号信息
         let phoneNumber = '';
        
        // 方式1: 优先尝试使用code获取 (新标准推荐)
         if (phoneCode) {
           try {
             console.log('尝试使用code获取手机号:', phoneCode);
             debugInfo.steps.push('try_code_exchange');
             
             // 跨账号调用修正：使用 http api 方式，或者确保权限集
             // 由于可能是跨账号（资源复用），尝试使用 cloud.openapi 可能会因为主体不一致报错
             // 但如果有 config.json 且在同一主体下，应该没问题。
             // 如果还是报错 -604101，可能是因为 wx-server-sdk 版本或云开发环境配置问题
             
             const result = await cloud.openapi.phonenumber.getPhoneNumber({
               code: phoneCode
             });
             console.log('code获取手机号结果:', JSON.stringify(result));
             
             // 记录API调用结果摘要
             debugInfo.codeExchangeResult = {
                errCode: result.errCode,
                errMsg: result.errMsg
             };
             
             // 兼容 wx-server-sdk 返回的驼峰命名和原始接口的下划线命名
             const errCode = result.errCode !== undefined ? result.errCode : result.errcode;
             const phoneInfo = result.phoneInfo || result.phone_info;
             
             if (errCode === 0 && phoneInfo) {
               phoneNumber = phoneInfo.phoneNumber;
               console.log('通过code获取到手机号:', phoneNumber);
               debugInfo.steps.push('got_phone_from_code');
             } else {
               console.warn('code获取手机号失败，错误码:', errCode, '错误信息:', result.errMsg || result.errmsg);
               debugInfo.errors.push(`code_exchange_failed: ${errCode} - ${result.errMsg || result.errmsg}`);
             }
           } catch (err) {
               console.error('使用code获取手机号异常:', err);
               debugInfo.errors.push(`code_exchange_exception: ${err.message}`);
               
               // 降级方案：使用 AppID + AppSecret 手动调用 HTTP 接口
               // 适用于跨账号调用且 cloud.openapi 鉴权失败的情况
               if (err.errCode === -604101 || err.errCode === 40013 || (err.message && (err.message.includes('-604101') || err.message.includes('40013') || err.message.includes('invalid appid')))) {
                 try {
                    console.log('尝试使用 HTTP API 降级方案...');
                    debugInfo.steps.push('try_http_api_fallback');
                    
                    const APPID = 'wx5eec087d24f932c7'; // 前端小程序 AppID
                    const SECRET = 'eb7783619c48b8e5467569fe8e312e47'; // 前端小程序 AppSecret
                    
                    // 1. 获取 access_token
                    // 注意：云函数环境通常没有 axios，使用 wx-server-sdk 提供的网络请求能力或者原生 http
                   // 这里使用 cloud.getAccessToken 可能拿到的是云资源方 token，我们需要前端小程序的 token
                   // 所以必须手动请求
                   
                   // 简单的 https 请求封装 (云函数 node 环境)
                   const https = require('https');
                   
                   const getAccessToken = () => {
                     return new Promise((resolve, reject) => {
                       const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`;
                       https.get(url, (res) => {
                         let data = '';
                         res.on('data', (chunk) => data += chunk);
                         res.on('end', () => {
                           try {
                             const result = JSON.parse(data);
                             if (result.access_token) resolve(result.access_token);
                             else reject(new Error(result.errmsg || 'get access_token failed'));
                           } catch (e) { reject(e); }
                         });
                       }).on('error', reject);
                     });
                   };
                   
                   const token = await getAccessToken();
                   console.log('获取到 AccessToken:', token ? 'success' : 'failed');
                   
                   // 2. 调用 getuserphonenumber
                   const getPhone = (accessToken, code) => {
                     return new Promise((resolve, reject) => {
                       const postData = JSON.stringify({ code: code });
                       const options = {
                         hostname: 'api.weixin.qq.com',
                         path: `/wxa/business/getuserphonenumber?access_token=${accessToken}`,
                         method: 'POST',
                         headers: {
                           'Content-Type': 'application/json',
                           'Content-Length': Buffer.byteLength(postData)
                         }
                       };
                       
                       const req = https.request(options, (res) => {
                         let data = '';
                         res.on('data', (chunk) => data += chunk);
                         res.on('end', () => {
                           try {
                             resolve(JSON.parse(data));
                           } catch (e) { reject(e); }
                         });
                       });
                       
                       req.on('error', reject);
                       req.write(postData);
                       req.end();
                     });
                   };
                   
                   const httpResult = await getPhone(token, phoneCode);
                   console.log('HTTP API 结果:', JSON.stringify(httpResult));
                   
                   if (httpResult.errcode === 0 && httpResult.phone_info) {
                     phoneNumber = httpResult.phone_info.phoneNumber;
                     console.log('通过 HTTP API 获取到手机号:', phoneNumber);
                     debugInfo.steps.push('got_phone_from_http_api');
                     // 清除之前的错误，因为我们成功了
                     debugInfo.errors = debugInfo.errors.filter(e => !e.includes('-604101'));
                   } else {
                     debugInfo.errors.push(`http_api_failed: ${httpResult.errcode} - ${httpResult.errmsg}`);
                   }
                   
                 } catch (httpErr) {
                   console.error('HTTP API 降级失败:', httpErr);
                   debugInfo.errors.push(`http_api_exception: ${httpErr.message}`);
                 }
               }
             }
           }
         
         // 方式2: 如果code方式失败，尝试从 CloudID 解析的数据中获取 (备选)
        if (!phoneNumber) {
            if (phoneData && phoneData.data && phoneData.data.phoneNumber) {
              phoneNumber = phoneData.data.phoneNumber;
              console.log('通过CloudID获取到手机号:', phoneNumber);
              debugInfo.steps.push('got_phone_from_cloudID');
            } else if (phoneData && phoneData.phoneNumber) {
              // 容错：有些情况下可能直接在顶层
              phoneNumber = phoneData.phoneNumber;
              console.log('通过phoneData直接获取到手机号:', phoneNumber);
              debugInfo.steps.push('got_phone_from_phoneData_direct');
            } else {
               if (phoneData) debugInfo.errors.push('cloudID_parse_failed_or_empty');
            }
        }
        
        if (!phoneNumber) {
          console.warn('未能获取到手机号，将以无手机号状态登录/注册');
          debugInfo.steps.push('login_without_phone');
        } else {
          debugInfo.hasPhoneNumber = true;
        }
        
        // 查询用户是否已存在
        
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

          // 如果有手机号，更新手机号
          if (phoneNumber) {
            updateData.phoneNumber = phoneNumber;
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
              is_new_user: false,
              phoneDebugInfo: debugInfo // 返回调试信息
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
            phoneNumber: phoneNumber || '', // 保存手机号
            isVIP: true,
            memberExpireTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 试用七天会员
            consumedTrees: 0,
            timeSequenceTrees: 0,
            lantingTrees: 0,
            treeCount: 0,
            footprints: [], // 初始化空的足迹数组
            referrer: referrer || null, // 推荐码字段，存储推广者ID
            create_time: db.serverDate(),
            update_time: db.serverDate()
          }
          
          // 如果有推荐码，记录推荐关系
          if (referrer) {
            console.log(`新用户 ${userId} 通过推荐码 ${referrer} 注册`)
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
              is_new_user: true,
              phoneDebugInfo: debugInfo // 返回调试信息
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
              create_time: Date.now()
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
