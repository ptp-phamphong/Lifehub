import { Observable, of } from 'rxjs';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Dictionary, Language, DEFAULT_LANGUAGE } from './types';
import { vi } from './dictionaries/vi';
import { en } from './dictionaries/en';

const DICTIONARIES: Record<Language, Dictionary> = { vi, en };

/**
 * Nạp bản dịch từ các file `.ts` đã được TypeScript kiểm tra, thay vì fetch
 * JSON qua HTTP như `TranslateHttpLoader` mặc định.
 *
 * Đánh đổi có chủ đích:
 *  - ĐƯỢC: TypeScript bắt lỗi ngay khi `vi.ts` và `en.ts` lệch key nhau.
 *    JSON trần không có kiểm tra này — thiếu key thì tới lúc chạy mới lộ.
 *  - ĐƯỢC: không có HTTP round-trip nên không bị nháy chuỗi thô lúc khởi động,
 *    và không phải lo `/app/` base-href khi trỏ đường dẫn file dịch.
 *  - MẤT: file dịch nằm trong bundle chính thay vì tải riêng theo ngôn ngữ.
 *    Với cỡ app này (vài chục KB text) thì không đáng kể; nếu sau này bundle
 *    phình lên thì đổi sang HTTP loader mà không phải sửa chỗ nào khác.
 */
export class TypedDictLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    const dict = DICTIONARIES[lang as Language] ?? DICTIONARIES[DEFAULT_LANGUAGE];
    return of(dict);
  }
}
