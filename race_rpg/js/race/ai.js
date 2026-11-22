/* AI ドライバー: 曲率から限界速度を計画し、ピュアパシュートで操舵する。プレイヤーと同じ物理を使う */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, C = RR.Course;

  function AI(car, course, o) {
    o = o || {};
    this.car = car; this.c = course;
    this.skill = o.skill || 0.9;       // 限界の何割で走るか
    this.pace = 1;                     // ラバーバンド補正
    this.line = o.line == null ? 0.7 : o.line; // イン側へ寄る度合い
    this.wobble = o.wobble || 0.3;     // ふらつき
    this.aggr = o.aggr || 1;           // ブレーキの遅さ
    var mu = car.sp.mu * Math.min(car.sp.muF, car.sp.muR) * 0.84 * (0.9 + 0.1 * (car.sp.steerQ || 1));
    this.plan = C.speedPlan(course, mu * this.skill, mu * 9.81 * 0.8 * this.skill * this.aggr);
    this.stuckT = 0;
    this.t = Math.random() * 100;
  }
  AI.prototype.control = function (dt) {
    var car = this.car, c = this.c;
    this.t += dt;
    var u = car.u;
    if (car.idx == null) { var l0 = C.locate(c, car.x, car.y, null); car.idx = l0.i; car.s = l0.s; car.d = l0.d; }
    var hw = c.width / 2;
    var look = 4 + Math.max(0, u) * 0.36;
    var sT = car.s + look;
    var pt = C.at(c, U.clamp(sT, 0, c.len));
    var iT = C.idx(c, sT + 6);
    var kAhead = c.ks[iT];
    var off = U.clamp(kAhead * 70, -1, 1) * (hw - 1.4) * this.line;
    off += Math.sin(this.t * 0.7) * this.wobble;
    // スタート直後は自分の車線を保ち、少しずつ走行ラインへ寄る（急に中央へ切り込んで加速を落とさない）
    if (this.lane0 == null) { this.lane0 = car.d || 0; this.s0 = car.s; }
    var keep = U.clamp(1 - (car.s - this.s0) / 120, 0, 1);
    off = off * (1 - keep) + this.lane0 * keep;
    var tx = pt.x + Math.cos(pt.psi) * off, ty = pt.y + Math.sin(pt.psi) * off;
    var fx = Math.sin(car.psi), fy = -Math.cos(car.psi), rx = Math.cos(car.psi), ry = Math.sin(car.psi);
    var dx = tx - car.x, dy = ty - car.y;
    var lf = dx * fx + dy * fy, lr = dx * rx + dy * ry;
    var curv = 2 * lr / Math.max(4, lf * lf + lr * lr);
    var delta = Math.atan(curv * car.sp.L);
    if (car.beta() * car.r < 0) delta += car.beta() * 0.6;
    var steer = U.clamp(delta / car.dmax(), -1, 1);
    // 速度
    var iv = C.idx(c, car.s + Math.max(3, u * 0.45));
    var vt = this.plan[iv] * this.pace;
    var thr = 0, brk = 0;
    if (u < vt - 1) thr = 1;
    else if (u < vt + 0.3) thr = U.clamp((vt + 0.3 - u) / 1.3, 0, 1) * 0.8;
    else if (u > vt + 0.6) brk = U.clamp((u - vt) / 4, 0.3, 1);
    // 立ち上がりはハンドルを戻しながら踏む
    if (Math.abs(steer) > 0.45 && u > 8) thr = Math.min(thr, 1.25 - Math.abs(steer));
    if ((car.spin[2] || car.spin[3]) && Math.abs(car.beta()) > 0.1) thr *= 0.5;
    if (Math.abs(car.beta()) > 0.3) thr *= 0.5;
    // 引っかかった時の復帰
    if (car.speed() < 1.2 && this.started) { this.stuckT += dt; } else this.stuckT = 0;
    if (this.stuckT > 2.5) {
      var p = C.at(c, car.s + 2);
      car.x = p.x; car.y = p.y; car.psi = p.psi; car.u = 4; car.v = 0; car.r = 0; car.reverse = false;
      this.stuckT = 0;
    }
    return { thr: thr, brk: brk, steer: steer };
  };
  RR.AI = AI;
})();
