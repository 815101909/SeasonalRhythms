Page({
  data: {
    contactWays: [
      {
        title: '客服邮箱',
        value: 'xiaoxiaovision@foxmail.com',
        icon: '✉️',
        copyable: true
      },
      {
        title: '官方微信',
        value: 'xiaovisiontogether',
        icon: '💬',
        copyable: true
      },
      {
        title: '工作时间',
        value: '周一至周五 9:00-18:00',
        icon: '🕒',
        copyable: false
      }
    ],
    faqs: [
      {
        question: '如何获得小树奖励？',
        answer: '您可以通过参与知识PK赛或城市漫游活动获得小树奖励。在竞答中答对问题、参与阵营对战或完成城市漫游任务都可以获得相应数量的小树。'
      },
      {
        question: '小树有什么用途？',
        answer: '小树作为虚拟奖励，可以用来兑换一些特殊功能，可以在主页查看小树规则和小树兑换哦。'
      },
      {
        question: '如何查看我的足迹？',
        answer: '在"漫游记"的城市漫游学习页面，点击单个足迹，即可留下您的足迹，并在主页足迹活动中查看。'
      }
    ],
    qrImageUrl: '' // 存储二维码图片的临时链接
  },

  onLoad() {
    this.getQRImageUrl();
  },

  async getQRImageUrl() {
    try {
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      });
      await c.init();
      
      const result = await c.getTempFileURL({
        fileList: ['cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/wx_QR/20250810-155526.png']
      });
      
      if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
        this.setData({
          qrImageUrl: result.fileList[0].tempFileURL
        });
      }
    } catch (err) {
      console.error('获取二维码图片临时链接失败:', err);
    }
  },

  previewQRImage() {
    const qrImageUrl = this.data.qrImageUrl;
    if (qrImageUrl) {
      wx.previewImage({
        current: qrImageUrl, // 当前显示图片的http链接
        urls: [qrImageUrl] // 需要预览的图片http链接列表
      });
    }
  },
  
  copyText(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },
  
  onShareAppMessage() {
    return {
      title: '联系客服 - 小舟摇风溪',
      path: '/pages/cloudDwelling/index'
    };
  }
})
 
 
 
 
 
 