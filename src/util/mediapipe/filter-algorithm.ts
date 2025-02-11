/**
 * 加权滑动平均滤波算法
 */
export class FilterAlgorithm {

  _originData: number[] = [];
  _filteredData: number[] = [];
  _weight: number[] = [0, 0.05, 0.1, 0.2, 0.25, 0.4];
  _windowSize: number = 5;

  static instancePool: Record<string, FilterAlgorithm> = {};

  static getInstance(name: string, options?: FilterAlgorithmOptions) {
    if (!this.instancePool[name]) {
      this.instancePool[name] = new FilterAlgorithm(options);
    }
    return this.instancePool[name];
  }

  constructor(options: FilterAlgorithmOptions = {}) {
    this._weight = options.weight || this._weight;
    this._windowSize = options.windowSize || this._windowSize;
  }

  getNum(num: number) {
    this._originData.push(num);

    let _num = num;
    
    // 尖刺数据过滤
    if (this._filteredData.length) {
      // 阈值
      const _threshold = 1;
      const _last = this._filteredData[this._filteredData.length - 1];
      if (_num > _last + _threshold) {
        _num = _last + _threshold;
      } else if (_num < _last - _threshold) {
        _num = _last - _threshold;
      }
    }

    // 加权滑动平均滤波
    let _filteredNum = 0;
    const _tempDataArr = [...this._filteredData, _num];
    for (let i = 0; i < _tempDataArr.length; i++) {
      _filteredNum += _tempDataArr[i] * this._weight[i];
    }

    _num = _filteredNum;

    //
    this._filteredData.push(_num);

    if (this._originData.length > this._windowSize) {
      this._originData.shift();
    }
    if (this._filteredData.length > this._windowSize) {
      this._filteredData.shift();
    }

    return _num;
  }
}

export type FilterAlgorithmOptions = {
  /**
   * 滤波窗口大小
   */
  windowSize?: number;
  /**
   * 滤波权重
   */
  weight?: number[];
}
