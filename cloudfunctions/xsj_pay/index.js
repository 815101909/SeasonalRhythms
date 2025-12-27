//云开发实现支付 - 微信支付APIv3
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const WxPay = require('wechatpay-node-v3');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// APIv3辅助函数（全局作用域）
const generateNonceStr = () => {
  return Math.random().toString(36).substr(2, 15);
};

const generateTimestamp = () => {
  return Math.floor(Date.now() / 1000);
};

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.FROM_OPENID || wxContext.OPENID;
  const { action, description, amount, planId, planName } = event;

  // 如果有 action 参数，路由到相应的处理函数
  if (action) {
    switch (action) {
      case 'checkMemberStatus':
        return await exports.checkMemberStatus(event, context);
      case 'activateMember':
        return await exports.activateMember(event, context);
      case 'redeemCode':
        return await exports.redeemCode(event, context);
      case 'updateMemberOrder':
        return await exports.updateMemberOrder(event, context);
      default:
        return { errcode: -1, errmsg: '未知的操作类型' };
    }
  }

  // 微信支付APIv3配置
  const config = {
    appid: 'wx5eec087d24f932c7', // 小程序AppID
    mchid: '1723171734', // 微信支付商户号
    apiV3Key: 'APIV3easyKEY2025remember12345678', // APIv3密钥
    notify_url: 'https://mp.weixin.qq.com', // 支付回调网址
    serial_no: '3292067A61C9A8FB151A27A3F4A26E0215C5EF6C',
    publicKey: 'PUB_KEY_ID_0117231717342025080600382090000403'
  };
  
  // 读取商户证书和私钥文件
  const apiclientCert = fs.readFileSync('./apiclient_cert.pem');
  const apiclientKey = fs.readFileSync('./apiclient_key.pem');
  
  // 初始化微信支付SDK
  let weChatPay;
  try {
    weChatPay = new WxPay({
      appid: config.appid,
      mchid: config.mchid,
      publicKey: apiclientCert,
      privateKey: apiclientKey
    });
    console.log('微信支付SDK初始化成功');
  } catch (error) {
    console.error('SDK初始化失败:', error.message);
    throw new Error('微信支付SDK初始化失败，请检查证书配置');
  }
  
  console.log('支付配置:', config);
  console.log('支付参数:', { description, amount, planId, planName });

  try {
    // 商户自行生成商户订单号
    const outTradeNo = `MEMBER_${Date.now()}_${Math.round(Math.random() * 10000)}`;

    // 获取用户的推荐人字符串
    let referrer = null;
    try {
      const userResult = await db.collection('xsj_users').where({
        openid: wxContext.FROM_OPENID || wxContext.OPENID
      }).get();
      
      if (userResult.data.length > 0) {
        referrer = userResult.data[0].referrer || null;
        console.log('支付订单 - 用户推荐人:', referrer);
      }
    } catch (error) {
      console.error('获取用户推荐人信息失败:', error);
    }

    // 存储订单信息到数据库
    const orderData = {
      userId: wxContext.FROM_OPENID || wxContext.OPENID,
      outTradeNo: outTradeNo,
      planId: planId || '',
      planName: planName || '',
      amount: amount.total / 100, // 转换为元
      status: 'pending', // pending, success, failed
      referrer: referrer, // 推荐人字符串
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    await db.collection('xsj_member_orders').add({
      data: orderData
    });

    // APIv3 JSAPI支付统一下单
    const orderParams = {
      appid: config.appid,
      mchid: config.mchid,
      description: description || '小舟摇风溪会员服务',
      out_trade_no: outTradeNo,
      notify_url: config.notify_url,
      amount: {
        total: amount.total, // 金额，单位分
        currency: 'CNY'
      },
      payer: {
        openid: wxContext.FROM_OPENID || wxContext.OPENID
      }
    };
    
    console.log('APIv3统一下单参数:', orderParams);
    console.log('用户openid:', wxContext.OPENID);
    
    // 使用SDK调用微信支付统一下单接口
    try {
      const result = await weChatPay.transactions_jsapi(orderParams);
      
      console.log('APIv3统一下单返回结果:', result);
      
      // 检查返回结果，wechatpay-node-v3可能直接返回支付参数
      let prepayId;
      if (result.prepay_id) {
        prepayId = result.prepay_id;
      } else if (result.package && result.package.includes('prepay_id=')) {
        // 如果SDK直接返回了支付参数，直接使用
        console.log('SDK直接返回支付参数，无需重新生成');
        return {
          data: result,
          out_trade_no: outTradeNo
        };
      } else {
        throw new Error('获取prepay_id失败: ' + JSON.stringify(result));
      }
      
      // 生成小程序支付参数
      const payParams = generateMiniProgramPayParams(prepayId, config);
      
      return {
        data: payParams,
        out_trade_no: outTradeNo
      };
    } catch (sdkError) {
      console.error('微信支付SDK调用失败:', sdkError);
      throw new Error('支付接口调用失败: ' + sdkError.message);
    }
  } catch (error) {
    console.error('创建支付订单失败:', error);
    return {
      errcode: -1,
      errmsg: error.message || '创建订单失败'
    };
  }
};

// 微信支付回调通知
exports.payNotify = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { APPID, MCHID, PARTNERKEY } = process.env;

  const config = {
    appid: APPID, // 小程序appid
    mchid: MCHID, // 商户号
    partnerKey: PARTNERKEY, // 微信支付安全密钥
  };

  const api = new Tenpay(config);

  try {
    // 验证签名并解析回调数据
    console.log('收到支付回调通知，event.body:', event.body);
    const result = await api.middleware(event.body);
    console.log('支付回调解析结果:', result);

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      console.log('支付回调成功，开始处理订单和激活会员');
      const { out_trade_no, transaction_id } = result;

      // TODO: 在这里完善会员激活逻辑
      // 1. 更新订单状态为成功
      const updateOrderRes = await db.collection('xsj_member_orders').where({
        outTradeNo: out_trade_no
      }).update({
        data: {
          status: 'success',
          transactionId: transaction_id,
          updateTime: db.serverDate()
        },
      });
      console.log('订单状态更新结果:', updateOrderRes);

      // 2. 激活会员
      const activateResult = await exports.activateMember({ outTradeNo: out_trade_no, transactionId: transaction_id });
      if (!activateResult.success) {
        console.error('会员激活失败:', activateResult.errmsg);
      } else {
        console.log('会员激活成功, 过期时间:', new Date(activateResult.memberExpireTime));
      }

      console.log('返回微信支付成功通知');
      return api.success(); // 返回成功给微信支付
    } else {
      console.error('支付回调失败:', result);
      console.log('返回微信支付失败通知');
      return api.fail('支付失败');
    }
  } catch (error) {
    console.error('处理支付回调异常:', error);
    return api.fail('处理异常');
  }
};

// 新增一个云函数用于激活会员
exports.activateMember = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.FROM_OPENID || wxContext.OPENID;
  const { outTradeNo, transactionId, planId, planName } = event;
  const _ = db.command;

  try {
    // 1. 更新订单状态为成功
    await db.collection('xsj_member_orders').where({
      userId: openId,
      outTradeNo: outTradeNo
    }).update({
      data: {
        status: 'success',
        transactionId: transactionId,
        updateTime: db.serverDate()
      },
    });

    // 2. 更新用户会员信息
    console.log('查询用户信息, openid:', wxContext.FROM_OPENID || wxContext.OPENID);
    const userRes = await db.collection('xsj_users').where({
      openid: openId
    }).get();
    console.log('用户查询结果:', userRes.data.length, '条记录');

    let memberExpireTime = Date.now();
    if (userRes.data.length > 0 && userRes.data[0].isVIP && userRes.data[0].memberExpireTime) {
      // 如果已经是会员，从当前会员过期时间开始计算
      memberExpireTime = userRes.data[0].memberExpireTime;
    }
    // 创建一个Date对象用于计算，保持memberExpireTime变量为时间戳
    const calculatedMemberDate = new Date(memberExpireTime);

    // 根据planId或planName确定会员时长，这里简化为固定时长
   // 根据planId或planName确定会员时长
      // 实际应用中应根据planId查询会员套餐配置，这里简化处理
      let durationMonths = 1; // 默认开通1个月会员
      if (event.planId === 1) {
        durationMonths = 1;
      } else if (event.planId === 2) {
        durationMonths = 3;
      } else if (event.planId === 3) {
        durationMonths = 6;
      }else if (event.planId === 4) {
        durationMonths = 12;
      }

      calculatedMemberDate.setMonth(calculatedMemberDate.getMonth() + durationMonths);
      memberExpireTime = calculatedMemberDate.getTime();

    console.log('准备更新用户会员信息, isVIP: true, memberExpireTime:', new Date(memberExpireTime));
    const updateResult = await db.collection('xsj_users').where({
      openid: openId
    }).update({
      data: {
        isVIP: true,
        memberExpireTime: memberExpireTime,
        updateTime: db.serverDate()
      },
    });
    console.log('用户会员信息更新结果:', updateResult);

    return { success: true, memberExpireTime: memberExpireTime };
  } catch (error) {
    console.error('激活会员失败:', error);
    return { success: false, errmsg: error.message || '激活会员失败' };
  }
};

// 新增一个云函数用于检查会员状态
exports.checkMemberStatus = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const _ = db.command;
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;

  try {
    // 检查用户是否已登录
    if (!openid) {
      console.log('checkMemberStatus: 用户未登录，返回非会员状态');
      return { success: false, error: '用户未登录', isVIP: false };
    }

    const memberInfo = await db.collection('xsj_users').where({
      openid: openid,
    }).field({
      isVIP: true,
      memberExpireTime: true
    }).get();

    if (memberInfo.data.length > 0) {
      const user = memberInfo.data[0];
      const now = new Date();
      let isVIP = user.isVIP && user.memberExpireTime && user.memberExpireTime > now.getTime();

      // 如果会员过期，将数据库中的 isVIP 字段更新为 false
      if (user.isVIP && user.memberExpireTime && user.memberExpireTime <= now.getTime()) {
        await db.collection('xsj_users').where({
          openid: wxContext.FROM_OPENID || wxContext.OPENID,
        }).update({
          data: {
            isVIP: false
          }
        });
        isVIP = false; // 更新内存中的 isVIP 状态
        console.log(`checkMemberStatus: User ${wxContext.FROM_OPENID || wxContext.OPENID} membership expired, updated isVIP to false in DB.`);
      }

      console.log(`checkMemberStatus: user.isVIP=${user.isVIP}, user.memberExpireTime=${user.memberExpireTime}, now=${now.getTime()}, calculated isVIP=${isVIP}`);
      return { success: true, isVIP: isVIP, memberExpireTime: user.memberExpireTime };
    } else {
      console.log('checkMemberStatus: No member info found, returning isVIP=false');
      return { success: true, isVIP: false };
    }
  } catch (error) {
    console.error('检查会员状态失败:', error);
    return { success: false, errmsg: error.message || '检查会员状态失败' };
  }
};

// 新增一个云函数用于更新会员订单状态
exports.updateMemberOrder = async (event, context) => {
  const { outTradeNo, status, transactionId } = event;
  const wxContext = cloud.getWXContext();
  const openId = wxContext.FROM_OPENID || wxContext.OPENID;

  try {
    const _ = db.command;
    const res = await db.collection('xsj_member_orders').where({
      outTradeNo: outTradeNo
    }).update({
      data: {
        status: status,
        transactionId: transactionId || '',
        updateTime: db.serverDate()
      },
    });
    return { success: true, data: res };
  } catch (error) {
    console.error('更新会员订单失败:', error);
    return { success: false, errmsg: error.message || '更新订单失败' };
  }
};

// 新增一个云函数用于兑换激活码
exports.redeemCode = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.FROM_OPENID || wxContext.OPENID;
  const { code } = event;
  const _ = db.command;

  if (!code) {
    return { success: false, errmsg: '请输入激活码' };
  }

  try {
    // 1. 查询激活码
    const codeRes = await db.collection('earth_codes').where({
      code: code,
      status: 'unused'
    }).get();

    if (codeRes.data.length === 0) {
      return { success: false, errmsg: '无效的激活码或已被使用' };
    }

    const codeInfo = codeRes.data[0];
    const days = codeInfo.days || 0;

    // 2. 标记激活码为已使用 (使用事务或原子操作更安全，这里简化处理)
    // 注意：云开发事务需要特定环境，这里先用原子更新检查
    // 为了防止并发，再次检查状态并更新
    const updateCodeRes = await db.collection('earth_codes').where({
      _id: codeInfo._id,
      status: 'unused'
    }).update({
      data: {
        status: 'used',
        usedBy: openId,
        usedTime: db.serverDate()
      }
    });

    if (updateCodeRes.stats.updated === 0) {
      return { success: false, errmsg: '激活码已被抢先使用' };
    }

    // 3. 更新用户会员信息
    console.log('查询用户信息, openid:', openId);
    const userRes = await db.collection('xsj_users').where({
      openid: openId
    }).get();

    let memberExpireTime = Date.now();
    if (userRes.data.length > 0 && userRes.data[0].isVIP && userRes.data[0].memberExpireTime) {
      // 如果已经是会员，从当前会员过期时间开始计算
      memberExpireTime = userRes.data[0].memberExpireTime;
    }
    
    // 创建一个Date对象用于计算
    const calculatedMemberDate = new Date(memberExpireTime);
    // 增加天数
    calculatedMemberDate.setDate(calculatedMemberDate.getDate() + days);
    memberExpireTime = calculatedMemberDate.getTime();

    console.log(`激活码兑换成功，增加 ${days} 天，新的过期时间:`, new Date(memberExpireTime));

    const updateResult = await db.collection('xsj_users').where({
      openid: openId
    }).update({
      data: {
        isVIP: true,
        memberExpireTime: memberExpireTime,
        updateTime: db.serverDate()
      },
    });

    return { 
      success: true, 
      memberExpireTime: memberExpireTime,
      days: days,
      msg: `成功激活 ${days} 天会员`
    };

  } catch (error) {
    console.error('兑换激活码失败:', error);
    return { success: false, errmsg: error.message || '兑换激活码失败' };
  }
};

// APIv3辅助函数

// 生成小程序支付参数
function generateMiniProgramPayParams(prepayId, config) {
  const timestamp = generateTimestamp().toString();
  const nonceStr = generateNonceStr();
  const packageStr = `prepay_id=${prepayId}`;
  
  // 构建签名字符串
  const signStr = `${config.appid}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
  
  // 使用商户私钥进行RSA签名
  const privateKey = fs.readFileSync(__dirname + '/apiclient_key.pem', 'utf8');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signStr);
  const paySign = sign.sign(privateKey, 'base64');
  
  return {
    timeStamp: timestamp,
    nonceStr: nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign: paySign
  };
}