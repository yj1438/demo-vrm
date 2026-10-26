import * as TWEEN from '@tweenjs/tween.js';

type AnimateArr = Array<{ t: number, y: number, easeFuction?: (amount: number) => number }>;

// TWEEN GROUP
const group = new TWEEN.Group();

/**
 * 用 Tween.js 实现动画
 * 按 cfg 配置的时间点和位置，实现动画
 * @param cfg
 * @param ele
 * @returns
 */
function createTween(cfg: AnimateArr, updateFn: (obj: any) => void = () => { }) {
  let _tweenFirst = null; // 第一个 tween
  //
  let _tweenLast = null;
  for (let i = 0; i < cfg.length - 1; i++) {
    const { t: t0, y: y0 } = cfg[i];
    const { t: t1, y: y1, easeFuction } = cfg[i + 1];

    const tween = new TWEEN.Tween({ y: y0 }, group);
    tween.to({ y: y1 }, t1 - t0);
    if (easeFuction) {
      tween.easing(easeFuction);
    }
    tween.onUpdate(function (obj) {
      //
      updateFn(obj);
    });
    if (_tweenLast) {
      _tweenLast.chain(tween);
    }
    _tweenLast = tween;

    //
    if (i === 0) {
      _tweenFirst = tween;
    }
  }

  return _tweenFirst;
}

// START
requestAnimationFrame(function animate(time) {
  group.update(time);
  requestAnimationFrame(animate);
});

// ----
// eg
const ele = document.getElementById('J_bar');

const cfg: AnimateArr = [
  { t: 0, y: 0 },
  { t: 1000, y: 80, easeFuction: TWEEN.Easing.Quadratic.InOut },
  { t: 1500, y: 20, easeFuction: TWEEN.Easing.Quadratic.InOut },
  { t: 2000, y: 90, easeFuction: TWEEN.Easing.Quadratic.InOut },
  { t: 3000, y: 50 },
  { t: 4000, y: 100 },
];

const tween = createTween(cfg, (obj) => {
  console.log('update', obj.y)
  ele.style.top = obj.y + 'px';
  // ele.position.y = obj.y;
});
tween.start();

