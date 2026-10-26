const examples = [
  { label: '人脸近景', file: 'face-closeup.jpg' },
  { label: '人物站姿', file: 'person-standing.jpg' },
];

/** 上传文件与预置 URL 共用同一条图片识别流程。 */
export function bindImageInput(
  input: HTMLInputElement,
  viewport: HTMLElement,
  onSelect: (source: File | string) => Promise<void>,
) {
  const picker = document.createElement('div');
  picker.id = 'J_image_examples';
  picker.className = 'image-examples';
  picker.setAttribute('role', 'group');
  picker.setAttribute('aria-label', '示例图片');
  viewport.before(picker);

  let busy = false;
  async function select(source: File | string) {
    if (busy) return;
    busy = true;
    // 模型在 IMAGE / VIDEO 间切换时，避免重复点击或配置变化打断初始化。
    const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>(
      '.toolbar input, .toolbar button, .toolbar select, .image-examples button',
    ));
    const disabled = controls.map((control) => control.disabled);
    controls.forEach((control) => { control.disabled = true; });
    picker.setAttribute('aria-busy', 'true');
    try {
      await onSelect(source);
    } finally {
      controls.forEach((control, index) => { control.disabled = disabled[index]; });
      picker.removeAttribute('aria-busy');
      busy = false;
    }
  }

  for (const example of examples) {
    const url = `${import.meta.env.BASE_URL}example/${example.file}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn image-example';
    const thumbnail = document.createElement('img');
    thumbnail.src = url;
    thumbnail.alt = '';
    const label = document.createElement('span');
    label.textContent = example.label;
    button.append(thumbnail, label);
    button.addEventListener('click', () => { void select(url); });
    picker.append(button);
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) void select(file);
  });
}

export function loadImage(source: File | string): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const release = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
    };
    // blob URL 使用 onload，避免部分环境的 img.decode() 挂起。
    img.onload = () => { release(); resolve(img); };
    img.onerror = () => { release(); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}
