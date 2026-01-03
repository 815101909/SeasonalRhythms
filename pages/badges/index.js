Page({
  data: {
    badges: [],
    badgeCount: 0,
    showDetail: false,
    selectedBadge: null
  },
  onLoad() {
    this.loadBadges();
  },
  onPullDownRefresh() {
    this.loadBadges().finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  async loadBadges() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.openid) {
        this.setData({ badges: [], badgeCount: 0 });
        return;
      }
      var c = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef'
      });
      await c.init();
      const res = await c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'getUserBadges',
          data: { openid: userInfo.openid }
        }
      });
      if (res.result && res.result.success) {
        const list = res.result.data || [];
        const processed = [];
        for (let i = 0; i < list.length; i++) {
          const icon = await this.getTemporaryImageUrl(list[i].iconUrl, '勋章图标');
          processed.push({
            badgeId: list[i].badgeId || (list[i]._id || ''),
            name: list[i].name || '',
            iconUrl: icon,
            description: list[i].description || '',
            obtainedAtDisplay: this.formatTime(list[i].obtainedAt)
          });
        }
        this.setData({
          badges: processed,
          badgeCount: processed.length
        });
      } else {
        this.setData({ badges: [], badgeCount: 0 });
      }
    } catch (e) {
      this.setData({ badges: [], badgeCount: 0 });
    }
  },
  showBadgeDetail(e) {
    this.playClickSound();
    const badge = e.currentTarget.dataset.badge;
    this.setData({
      showDetail: true,
      selectedBadge: badge
    });
  },
  hideBadgeDetail() {
    this.playClickSound();
    this.setData({
      showDetail: false
    });
  },
  async getTemporaryImageUrl(imageUrl, type) {
    if (!imageUrl) {
      return '../../images/placeholder-a4.svg';
    }
    try {
      if (imageUrl.startsWith('cloud://')) {
        var c = new wx.cloud.Cloud({
          identityless: true,
          resourceAppid: 'wx85d92d28575a70f4',
          resourceEnv: 'cloud1-1gsyt78b92c539ef'
        });
        await c.init();
        const result = await c.getTempFileURL({
          fileList: [imageUrl]
        });
        if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
          return result.fileList[0].tempFileURL;
        } else {
          return '../../images/placeholder-a4.svg';
        }
      }
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      return '../../images/placeholder-a4.svg';
    } catch (err) {
      return '../../images/placeholder-a4.svg';
    }
  },
  formatTime(ts) {
    if (!ts) return '';
    try {
      const d = new Date(typeof ts === 'string' ? parseInt(ts, 10) : ts);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch (_) {
      return '';
    }
  },
  navigateBack() {
    this.playClickSound();
    wx.navigateBack();
  },
  playClickSound: function() {
    try {
      const c = wx.createInnerAudioContext();
      c.obeyMuteSwitch = false;
      c.autoplay = false;
      c.src = '/static/click.wav';
      c.volume = 0.5;
      c.play();
      c.onEnded(() => { c.destroy(); });
      c.onError(() => { c.destroy(); });
    } catch (e) {}
  }
});
