// Install @playwright/test during bootstrap; configure baseURL = process.env.BASE_URL.
// Use fresh disposable test accounts. Trace/video OFF; artifacts stay private.
import {test,expect} from '@playwright/test';
const env=(k:string)=>{const v=process.env[k];if(!v)throw Error(`Missing ${k}`);return v;};
test('signup, title-only save, clean-browser login and isolation',async({browser,baseURL})=>{
  if(process.env.QA_ALLOW_SIGNUPS!=='yes')throw Error('Explicit disposable signup consent required');
  if(!baseURL)throw Error('Set BASE_URL in Playwright config');
  const emailA=env('QA_EMAIL_A'),emailB=env('QA_EMAIL_B');
  const passA=env('QA_PASSWORD_A'),passB=env('QA_PASSWORD_B');
  if(emailA===emailB)throw Error('Distinct disposable accounts required');
  const marker=`QA-${crypto.randomUUID()}`;
  const a=await browser.newContext({baseURL});const page=await a.newPage();
  await page.goto('/');await expect(page.getByRole('link',{name:/sign up/i}).first()).toBeVisible();
  await page.goto('/signup');await page.getByTestId('signup-email').fill(emailA);
  await page.getByTestId('signup-password').fill(passA);await page.getByTestId('signup-submit').click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await page.getByTestId('core-input').fill(marker);await page.getByTestId('core-submit').click();
  await expect(page.getByTestId('core-item').filter({hasText:marker})).toHaveCount(1);
  await page.reload();await expect(page.getByTestId('core-item').filter({hasText:marker})).toHaveCount(1);
  for(const route of ['/','/signup','/login','/app']){await page.goto(route);await expect(page.getByTestId('logout')).toBeVisible();}
  await page.getByTestId('logout').click();await page.goto('/app');await expect(page).toHaveURL(/\/login/);await a.close();
  const clean=await browser.newContext({baseURL});const p=await clean.newPage();await p.goto('/login');
  await p.getByTestId('login-email').fill(emailA);await p.getByTestId('login-password').fill(passA+'wrong');
  await p.getByTestId('login-submit').click();
  // Implementation must expose a meaningful accessible error, not silently ignore rejection.
  await expect(p.getByRole('alert')).toBeVisible();await expect(p).toHaveURL(/\/login/);
  await expect(p.getByTestId('core-item')).toHaveCount(0);
  await p.getByTestId('login-password').fill(passA);await p.getByTestId('login-submit').click();
  await expect(p).toHaveURL(/\/app\/?$/);await expect(p.getByTestId('core-item').filter({hasText:marker})).toHaveCount(1);
  const b=await browser.newContext({baseURL});const q=await b.newPage();await q.goto('/signup');
  await q.getByTestId('signup-email').fill(emailB);await q.getByTestId('signup-password').fill(passB);await q.getByTestId('signup-submit').click();
  await expect(q).toHaveURL(/\/app\/?$/);await expect(q.getByTestId('core-item').filter({hasText:marker})).toHaveCount(0);
  const markerB=`QA-${crypto.randomUUID()}`;await q.getByTestId('core-input').fill(markerB);await q.getByTestId('core-submit').click();
  await expect(q.getByTestId('core-item').filter({hasText:markerB})).toHaveCount(1);
  await p.reload();await expect(p.getByTestId('core-item').filter({hasText:markerB})).toHaveCount(0);
  // Keep screenshots private: populated app screenshots include disposable test markers.
  await q.setViewportSize({width:375,height:812});
  expect(await q.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await q.screenshot({path:'test-results/app-mobile.png',fullPage:true});
  await clean.close();await b.close();
});
