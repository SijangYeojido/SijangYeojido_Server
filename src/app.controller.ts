import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getPrivacyPolicy(): string {
    return renderPolicyPage(
      '개인정보 처리방침',
      [
        '시장여지도는 전통시장 지도 탐색, 특가 예약, 쿠폰, 즐겨찾기, 상인 관리 기능 제공을 위해 필요한 최소한의 개인정보만 처리합니다.',
        '처리 항목은 이메일 주소, 사용자 식별자, 닉네임, 역할 정보, 예약 및 쿠폰 이용 내역, 상인이 직접 등록한 점포/상품 사진입니다.',
        '수집한 정보는 앱 기능 제공, 고객 지원, 서비스 안정성 개선, 부정 이용 방지를 위해 사용하며, 사용자의 동의 없이 광고 추적 목적으로 사용하지 않습니다.',
        '사용자는 앱 내 프로필 및 개인정보 설정 화면에서 주요 정보를 확인할 수 있으며, 계정 삭제 또는 개인정보 관련 요청은 지원 메일로 접수할 수 있습니다.',
        '문의: infinity.element.rpg@gmail.com',
      ],
    );
  }

  @Get('support')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getSupport(): string {
    return renderPolicyPage('시장여지도 지원', [
      '시장여지도 이용 중 문제가 발생하면 아래 지원 메일로 문의해 주세요.',
      '지원 메일: infinity.element.rpg@gmail.com',
      '문의 시 사용 중인 기기, iOS 버전, 앱 버전, 발생 화면, 재현 절차를 함께 보내주시면 더 빠르게 확인할 수 있습니다.',
    ]);
  }

  @Get('marketing')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getMarketing(): string {
    return renderPolicyPage('시장여지도', [
      '시장여지도는 전통시장 안의 점포, 특가, 편의시설 정보를 지도에서 탐색하고 오늘의 특가를 예약할 수 있는 모바일 서비스입니다.',
      '사용자는 신원시장 점포 정보, 실시간 특가, 쿠폰, 예약 내역을 확인할 수 있고 상인은 점포와 상품 정보를 관리할 수 있습니다.',
      '지원 메일: infinity.element.rpg@gmail.com',
    ]);
  }
}

function renderPolicyPage(title: string, paragraphs: string[]): string {
  const body = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f8fafc; }
    main { max-width: 720px; margin: 0 auto; padding: 48px 20px; }
    h1 { margin: 0 0 24px; font-size: 30px; line-height: 1.25; }
    p { margin: 0 0 16px; font-size: 16px; line-height: 1.7; }
    .updated { margin-top: 32px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    ${body}
    <p class="updated">최종 업데이트: 2026-06-04</p>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
