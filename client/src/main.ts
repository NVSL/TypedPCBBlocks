import './style.css';
import { Tscheda, TschedaDebug } from 'tscheda';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <h1>Hello Vite?</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`;

async function readURLFile(path: string) {
  let text = '';
  const respionse = await fetch(new Request(path));
  if (!respionse.ok) throw new Error(respionse.statusText);
  text = await respionse.text();
  return text;
}

async function eagelFile(
  filename: string,
): Promise<{ data: string; filename: string }> {
  const tschPath = '../data/typedSchematics/';
  const data = await readURLFile(tschPath + filename);
  return { data: data, filename: filename };
}

async function led(): Promise<void> {
  console.log('\n--- LED DESIGN');
  try {
    const tscheda = new Tscheda('http://localhost:3000/data/typedConstraints/');
    const atmega328 = await tscheda.use(await eagelFile('atmega328.sch'));
    const led = await tscheda.use(await eagelFile('led_smd.sch'));
    const power5V12V = await tscheda.use(await eagelFile('power5V12V.sch'));
    const power5V = await tscheda.use(await eagelFile('power5V.sch'));

    const Mat5V12V = tscheda.newMat(power5V12V);
    const Mat5V = tscheda.newMat(power5V);

    tscheda.addMat('root', Mat5V12V);
    tscheda.addMat(Mat5V12V, Mat5V);

    tscheda.addTsch(Mat5V, atmega328);
    tscheda.addTsch(Mat5V, led);

    await tscheda.connect({ uuid: atmega328, protocol: 'GPIO-9' }, [
      { uuid: led, protocol: 'GPIO-0' },
    ]);

    tscheda.printConnectionMap();

    tscheda.drc();

    const jsonData = tscheda.generateJson();
    console.log('JSON OUTPUT', jsonData);
  } catch (e) {
    throw e;
  }

  return;
}

(async () => {
  TschedaDebug.enable(true, 1);
  await led();
  /* TODO: 
  - Start UI
  */
})();
