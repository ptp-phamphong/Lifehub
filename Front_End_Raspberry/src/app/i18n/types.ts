/**
 * Toàn bộ chuỗi hiển thị cho người dùng.
 *
 * Thêm một ngôn ngữ = thêm một file thoả `Dictionary` — TypeScript sẽ báo lỗi
 * nếu còn key nào chưa dịch. Cùng ý tưởng với `Portfolio/data/types.ts`.
 *
 * LƯU Ý: đây là `type` chứ không phải `interface` — có chủ đích. Interface trong
 * TypeScript không tự sinh index signature nên không gán được vào
 * `TranslationObject` của ngx-translate; type alias thì được.
 *
 * Cấu trúc lồng nhau ở đây tương ứng với key phân cách bằng dấu chấm khi dùng:
 * `login.title` → `dict.login.title`.
 */
export type Dictionary = {
  /** Tên ngôn ngữ hiển thị trong bộ chọn, viết bằng chính ngôn ngữ đó. */
  languageName: string;

  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    close: string;
    confirm: string;
    loading: string;
    search: string;
    actions: string;
    yes: string;
    no: string;
    connectionError: string;
    /** Hậu tố tiền tệ. Không dịch số, chỉ dịch cách viết đơn vị. */
    currencySuffix: string;
    /**
     * Hậu tố tiền tệ dạng ngắn, viết SÁT số (`1.250.000đ`).
     * Dùng ở ô lịch tháng — chỗ đó hẹp, `VNĐ` sẽ tràn dòng.
     */
    currencyShort: string;
  };

  /** Thanh điều hướng chính (`main-tab`) — hiện ở mọi trang sau khi đăng nhập. */
  nav: {
    /** Dòng phụ dưới chữ "Raspberry". Tên thương hiệu không dịch. */
    brandSub: string;
    /** aria-label cho thẻ <nav>. */
    mainNavigation: string;
    logout: string;
    systemInfo: string;
    expenses: string;
    analytics: string;
    courseSchedule: string;
    settings: string;
  };

  /** Menu bên trái của khu vực Cài đặt (`settings-tab`). */
  settings: {
    title: string;
    reasonType: string;
    courseSchedule: string;
    semester: string;
    systemConfiguration: string;
    appearance: string;
    userManagement: string;
    visitorLog: string;
    jobs: string;
    zalo: string;
  };

  /** Trang Cài đặt giao diện — nơi đặt cả bộ chọn ngôn ngữ. */
  theme: {
    title: string;
    webDark: string;
    webDarkDesc: string;
    mobileDark: string;
    mobileDarkDesc: string;
    language: string;
    languageDesc: string;
    /** Tooltip/aria-label cho nút đổi theme trên thanh tiêu đề. */
    switchToDark: string;
    switchToLight: string;
  };

  /**
   * Quản lý loại chi tiêu (`reason-type`).
   * LƯU Ý: chỉ nhãn giao diện. Tên loại (`item.reasonName`) là dữ liệu người dùng
   * nhập, hiển thị nguyên văn ở mọi ngôn ngữ — xem §4.3 của kế hoạch i18n.
   */
  reasonType: {
    listTitle: string;
    addNew: string;
    editTitle: string;
    addTitle: string;
    id: string;
    name: string;
    namePlaceholder: string;
    sortOrder: string;
    sortOrderPlaceholder: string;
    status: string;
    active: string;
    hidden: string;
    defaultFilter: string;
    filterNone: string;
    filterInclude: string;
    filterExclude: string;
    saveSuccess: string;
    saveFailed: string;
    missingName: string;
    missingFilter: string;
  };

  /**
   * Học kỳ (`semester-metadata`).
   * `semesterName` / `codeSemester` là dữ liệu DB — hiển thị nguyên văn.
   */
  semester: {
    listTitle: string;
    addNew: string;
    editTitle: string;
    addTitle: string;
    id: string;
    code: string;
    codePlaceholder: string;
    name: string;
    namePlaceholder: string;
    year: string;
    yearPlaceholder: string;
    isCurrent: string;
    current: string;
    notCurrent: string;
    missingName: string;
    missingCode: string;
    missingYear: string;
    onlyOneCurrent: string;
    loadFailed: string;
    updateFailed: string;
    createFailed: string;
    /** Có tham số {{name}} — tên học kỳ lấy từ DB, chèn nguyên văn. */
    confirmDelete: string;
  };

  /**
   * Cấu hình đặc biệt (`system-configuration`).
   * `keyConfig` / `valueConfig` là dữ liệu DB — hiển thị nguyên văn, kể cả những
   * key kỹ thuật như `THEME_WEB_DARK`.
   */
  systemConfig: {
    listTitle: string;
    addNew: string;
    editTitle: string;
    addTitle: string;
    id: string;
    key: string;
    keyPlaceholder: string;
    value: string;
    valuePlaceholder: string;
    missingKey: string;
    missingValue: string;
    loadFailed: string;
    updateFailed: string;
    createFailed: string;
    /** Có tham số {{name}} — khóa cấu hình từ DB, chèn nguyên văn. */
    confirmDelete: string;
  };

  /**
   * Quản lý người dùng (`user-management`).
   * `username`, `name`, `email` là dữ liệu DB — hiển thị nguyên văn.
   */
  user: {
    listTitle: string;
    addNew: string;
    id: string;
    username: string;
    usernamePlaceholder: string;
    name: string;
    namePlaceholder: string;
    /** Nhãn đầy đủ: "Email" là thuật ngữ chung, phần giải thích trong ngoặc mới cần dịch. */
    email: string;
    emailPlaceholder: string;
    status: string;
    active: string;
    inactive: string;
    changePassword: string;
    createTitle: string;
    editTitle: string;
    passwordTitle: string;
    password: string;
    newPassword: string;
    passwordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    loadFailed: string;
    missingFields: string;
    missingName: string;
    missingNewPassword: string;
    passwordMismatch: string;
    createFailed: string;
    updateFailed: string;
    changePasswordFailed: string;
    /** Có tham số {{name}} — tên đăng nhập từ DB, chèn nguyên văn. */
    confirmDelete: string;
  };

  /**
   * Chi tiêu / thu vào (`expense-record`, `expense-record-list`).
   * Hai tab dùng chung component nên nhiều nhãn có cặp `…Expense` / `…Income`.
   * `reason` và tên loại (`reasonName`) là dữ liệu DB — hiển thị nguyên văn.
   */
  expense: {
    tabExpense: string;
    tabIncome: string;
    listTitleExpense: string;
    listTitleIncome: string;
    sumMonthExpense: string;
    sumMonthIncome: string;
    sumAllExpense: string;
    sumAllIncome: string;
    sumFilteredExpense: string;
    sumFilteredIncome: string;
    sumWeekExpense: string;
    sumWeekIncome: string;
    dateExpense: string;
    dateIncome: string;
    addExpense: string;
    addIncome: string;
    showAllHistory: string;
    groupingByDay: string;
    groupByDay: string;
    filterByReason: string;
    filterByNotReason: string;
    selectReasonType: string;
    id: string;
    reason: string;
    reasonPlaceholder: string;
    reasonType: string;
    amount: string;
    amountPlaceholder: string;
    selectDate: string;
    /**
     * Có tham số {{count}}. Tách hai key vì tiếng Anh phân biệt số ít/số nhiều
     * ('1 entry' chứ không phải '1 entries'); tiếng Việt thì hai bản giống nhau.
     */
    itemCount: string;
    itemCountOne: string;
    unknownDate: string;
    /** Hậu tố cho loại đã ngừng dùng — nhãn, không phải dữ liệu. */
    inactiveSuffix: string;
    formTitleAddExpense: string;
    formTitleEditExpense: string;
    formTitleAddIncome: string;
    formTitleEditIncome: string;
    saveSuccess: string;
    saveFailed: string;
    missingFields: string;
    aiFailed: string;
    aiError: string;
    /** Có tham số {{name}} — nội dung ghi chú từ DB, chèn nguyên văn. */
    confirmDeleteExpense: string;
    confirmDeleteIncome: string;
  };

  /**
   * Phân tích chi tiêu (`expense-analytics`, 9 component + tầng transform).
   *
   * Ba điều khác các nhánh còn lại:
   *
   * 1. **Nhiều chuỗi nằm trong SVG** (nhãn trục, `<title>` tooltip, chú giải).
   *    Chúng được dựng trong `build()` của từng biểu đồ chứ không qua pipe, nên
   *    trang cha phải dựng lại toàn bộ view-model khi đổi ngôn ngữ — xem
   *    `expense-analytics-page.component.ts`.
   * 2. **Tên loại chi là dữ liệu DB** (`ReasonType.reasonName`) nên hiển thị
   *    nguyên văn. Chỉ hai nhãn do code sinh ra mới dịch: nhóm "chưa phân loại"
   *    (`uncategorized`) và nhóm gộp đuôi (`otherGroup*`).
   * 3. **`otherGroup*` là một DANH SÁCH ứng viên**, không phải một chuỗi. Người
   *    dùng có thể tự đặt một loại tên đúng bằng `Khác`; khi trùng, tầng
   *    transform lấy ứng viên tiếp theo để hai thứ khác nhau không nằm chung
   *    một đoạn cột.
   */
  analytics: {
    title: string;
    subtitle: string;

    dateRange: string;
    range6: string;
    range12: string;
    range24: string;
    rangeAll: string;
    filterIn: string;
    /** Chú thích nhỏ cạnh nhãn: lọc loại không áp cho khoản thu. */
    filterInHint: string;
    filterInPlaceholder: string;
    filterOut: string;
    filterOutPlaceholder: string;
    anchorMonth: string;
    reload: string;
    /** {{time}} — giờ nạp dữ liệu, đã định dạng theo locale. */
    loadedAt: string;
    /** {{detail}} — ghép từ `filterCountIn` / `filterCountOut`. */
    filteringNote: string;
    /** {{count}} — số loại đang lọc vào / loại trừ. */
    filterCountIn: string;
    filterCountOut: string;
    clearFilter: string;
    /** {{count}} — số khoản không có ngày nên bị loại khỏi biểu đồ thời gian. */
    skippedNote: string;
    loadError: string;

    /** Khung thẻ dùng chung (`chart-panel`). */
    viewChart: string;
    viewTable: string;
    emptyRange: string;

    kpiExpense: string;
    kpiIncome: string;
    kpiBalance: string;
    kpiAvgPerDay: string;
    /** {{month}} — tên tháng trước, dạng viết giữa câu. */
    kpiHintVsPrev: string;
    kpiHintBalance: string;
    /** {{days}} — số ngày đã trôi qua trong tháng neo. */
    kpiHintAvgPerDay: string;
    kpiNoCompare: string;

    incomeExpenseTitle: string;
    /** {{count}} — số tháng của khoảng đang xem. */
    subtitleRange: string;
    subtitleRangeAll: string;
    /** {{count}} — như trên, thêm vế "xếp theo tổng tiền". */
    subtitleRangeByTotal: string;
    subtitleRangeAllByTotal: string;
    incomeExpenseNote: string;
    legendExpense: string;
    legendIncome: string;

    categoryRankTitle: string;
    weekdayTitle: string;
    weekdaySubtitle: string;
    categoryStackTitle: string;
    /** {{other}} — nhãn nhóm gộp thực tế, có thể khác `otherGroup`. */
    categoryStackSubtitle: string;
    /** {{month}} — tên tháng neo, dạng tiêu đề. */
    heatmapTitle: string;
    heatmapSubtitle: string;
    heatLow: string;
    /** {{month}} — tên tháng neo / tháng trước, dạng tiêu đề & giữa câu. */
    cumulativeTitle: string;
    cumulativeSubtitle: string;
    cumulativeColumn: string;
    untilToday: string;

    colMonth: string;
    colExpense: string;
    colIncome: string;
    colBalance: string;
    colCategory: string;
    colCount: string;
    colTotal: string;
    colWeekday: string;
    colDay: string;
    /** {{day}} — số ngày trong tháng. */
    dayNumber: string;

    /** Tooltip trong SVG. {{month}}/{{category}}/{{dow}}/{{day}} + {{amount}}. */
    tooltipExpense: string;
    tooltipIncome: string;
    tooltipStack: string;
    tooltipWeekday: string;
    tooltipHeatFuture: string;
    tooltipHeatEmpty: string;
    tooltipHeatValue: string;

    /** aria-label của từng <svg> — người dùng screen reader nghe thấy. */
    ariaIncomeExpense: string;
    ariaCategoryStack: string;
    ariaWeekday: string;
    ariaCumulative: string;

    uncategorized: string;
    /**
     * Ứng viên tên nhóm gộp, thử theo thứ tự. Nhiều hơn một vì tên loại là do
     * người dùng đặt nên có thể trùng — xem chú thích của cả nhánh ở trên.
     */
    otherGroup: string;
    otherGroupAlt1: string;
    otherGroupAlt2: string;
    /** {{index}} — hậu tố số khi mọi ứng viên trên đều trùng. */
    otherGroupNumbered: string;

    /**
     * Tiền rút gọn cho nhãn trục. Cả con số lẫn khoảng trắng đều nằm trong mẫu:
     * tiếng Việt viết `12,5 tr`, tiếng Anh viết `12.5M` không có dấu cách.
     */
    compactBillion: string;
    compactMillion: string;
    compactThousand: string;
    /**
     * Tháng dạng ngắn cho nhãn trục X. Tham số cấp đủ cho cả hai kiểu viết:
     * `{{m}}` số tháng, `{{mon}}` tên tháng viết tắt theo locale, `{{y2}}` hai
     * số cuối của năm. Mỗi ngôn ngữ dùng cái nào là việc của bản dịch.
     */
    monthShort: string;
  };

  /**
   * Gửi tin nhắn Zalo (`zalo-page`).
   *
   * Đặc điểm riêng: gần như MỌI thông báo ở đây đều có dạng
   * `r.message || 'chuỗi dự phòng'` — backend gửi gì thì hiện nguyên văn, không
   * có thì mới dùng chuỗi của client. Vì vậy component giữ cả cặp
   * `…MessageKey` + `…MessageRaw` (§4.1), chứ không chỉ một biến.
   *
   * `ZaloContact.label` là cấu hình phía server nên hiển thị nguyên văn (§4.3).
   */
  zalo: {
    title: string;
    subtitle: string;
    checkStatus: string;
    /** Hiện khi backend báo tính năng tắt (chạy ngoài Raspberry Pi). */
    disabledNotice: string;

    loginCardTitle: string;
    loginButton: string;
    waitingScan: string;
    qrAlt: string;

    composeTitle: string;
    recipient: string;
    noContacts: string;
    content: string;
    contentPlaceholder: string;
    sendButton: string;
    sending: string;

    screenshotHint: string;
    screenshotAlt: string;
    screenshotZoomTitle: string;

    // --- Thông báo đăng nhập ---
    opening: string;
    openFailed: string;
    scanQr: string;
    loggedIn: string;
    qrExpired: string;
    lostConnection: string;

    // --- Thông báo gửi tin ---
    missingFields: string;
    sent: string;
    needLogin: string;
    rateLimited: string;
    contactNotFound: string;
    sendFailed: string;
    sendError: string;

    /** Dùng chung cho cả hai luồng khi backend không kèm message. */
    piOnly: string;
    genericError: string;
  };

  /**
   * Tác vụ nền (`jobs-page`) — lịch sử chạy job Hangfire.
   *
   * `jobName` và `errorMessage` đến từ backend nên hiển thị nguyên văn (§4.3).
   * Nhãn trạng thái thì dịch, nhưng trạng thái lạ ngoài danh sách sẽ rơi về
   * chính chuỗi Hangfire trả về — cũng là dữ liệu, cũng để nguyên.
   */
  jobs: {
    title: string;
    subtitle: string;
    refresh: string;
    /** Hiện trên nút trong lúc chờ backend nhận yêu cầu. */
    sending: string;
    /** Nhãn các nút "Chạy ngay"; khoá job khớp `JobDefinitions.cs` ở backend. */
    runScheduleImport: string;
    runVisitorLogMaintenance: string;
    runDemoReseed: string;
    colName: string;
    colStatus: string;
    colStarted: string;
    colFinished: string;
    colDuration: string;
    /** Tooltip trên dòng có lỗi. */
    clickForError: string;
    empty: string;
    loadFailed: string;
    triggered: string;
    triggerFailed: string;
    statusSucceeded: string;
    statusFailed: string;
    statusProcessing: string;
    statusEnqueued: string;
    statusScheduled: string;
    /**
     * Thời gian chạy. Có {{value}} / {{minutes}} + {{seconds}} đã định dạng sẵn
     * theo locale ở component — `toFixed()` luôn dùng dấu chấm, sai với tiếng
     * Việt (phải là `1,5 giây`). Đơn vị `ms` là ký hiệu quốc tế nên không có key.
     */
    durationSeconds: string;
    durationMinutes: string;
  };

  /**
   * Thông tin hệ thống (`system-info-tab`) — nhiệt độ CPU, RAM/đĩa còn trống.
   *
   * Đơn vị (`GiB`, `GB`, `°C`) và chuỗi lỗi backend trả về KHÔNG dịch: đơn vị là
   * ký hiệu quốc tế, còn thông báo lỗi là kỹ thuật và đến từ ngoài client.
   */
  systemInfo: {
    title: string;
    subtitle: string;
    refresh: string;
    cpuTemp: string;
    ramFree: string;
    diskFree: string;
    /** Ghi chú dưới thang đo, và cũng nằm trong aria-label của đồng hồ. */
    throttleThreshold: string;
    /** Có {{temp}} — ngưỡng hạ xung nhịp. Dùng cho aria-label. */
    gaugeAriaLabel: string;
    /** Ba trạng thái nhiệt, tương ứng `tempState` 'mat' | 'am' | 'nong'. */
    stateCool: string;
    stateWarm: string;
    stateThrottling: string;
    /** Đứng trước chuỗi lỗi thô của backend, nên không có dấu chấm cuối. */
    readFailed: string;
  };

  /**
   * Thời khóa biểu (`course-schedule/*`) — danh sách môn, form, lịch tuần, lịch tháng.
   *
   * KHÔNG dịch, vì đều là dữ liệu từ DB / portal UEH: tên môn, mã môn, phòng,
   * giảng viên, lớp học phần, tên học kỳ, và `learningMode` (`ONLINE`, `LMS`,
   * `NGHỈ`). Riêng `NGHỈ` còn là sentinel so sánh trong `utils/learning-mode.ts`
   * nên dịch nó sẽ làm hỏng việc nhận diện buổi nghỉ. Xem §4.3 kế hoạch i18n.
   */
  course: {
    // --- Danh sách môn học ---
    listTitle: string;
    addNew: string;
    selectSemesterForImport: string;
    importExcel: string;
    reimportUeh: string;
    deleteAll: string;
    id: string;
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    time: string;
    dayOfWeek: string;
    roomAddress: string;
    semester: string;
    empty: string;
    /** Hiện khi bản ghi chưa gắn học kỳ nào — nhãn thay thế, không phải dữ liệu. */
    noSemester: string;
    /** Có {{count}} — số dòng import được. */
    importSuccess: string;
    importFailed: string;
    resetImportSuccess: string;
    resetImportFailed: string;
    /** Có {{name}} — tên môn từ DB, chèn nguyên văn. */
    confirmDelete: string;
    confirmResetImport: string;
    confirmResetImportAgain: string;
    confirmDeleteAll: string;
    confirmDeleteAllAgain: string;
    selectSemesterToDelete: string;

    // --- Form thêm/sửa môn ---
    formTitleAdd: string;
    formTitleEdit: string;
    codePlaceholder: string;
    namePlaceholder: string;
    room: string;
    roomPlaceholder: string;
    address: string;
    /** Ví dụ là địa chỉ có thật — giữ nguyên tên riêng, chỉ dịch chữ "VD". */
    addressPlaceholder: string;
    startTime: string;
    endTime: string;
    selectDate: string;
    noSemesterSelected: string;
    dayOfWeekField: string;
    selectDayOfWeek: string;
    loadFailed: string;
    missingFields: string;
    createSuccess: string;
    createFailed: string;
    updateSuccess: string;
    updateFailed: string;

    // --- Lịch tuần / lịch tháng ---
    viewWeek: string;
    viewMonth: string;
    viewSchedule: string;
    viewExpense: string;
    swipeWeekHint: string;
    swipeMonthHint: string;
    /** Có {{count}} — số môn bị ẩn bớt trong ô lịch. Đã gồm dấu '+'. */
    moreCount: string;
    /** Tiêu đề bảng chi tiêu của một ngày. Có {{date}} đã định dạng sẵn. */
    expenseOnDate: string;
    total: string;

    // --- Bảng chi tiết một buổi học ---
    sessionDate: string;
    period: string;
    learningMode: string;
    lecturer: string;
    classCode: string;

    /**
     * Tên thứ dạng ngắn cho tiêu đề cột lịch. Giữ trong từ điển thay vì lấy từ
     * `Intl` vì cột lịch rất hẹp: `Intl` cho ra "Th 2" (dài hơn "T2") và sẽ
     * xuống dòng. Tiêu đề tháng thì ngược lại — rộng rãi nên dùng `Intl`.
     */
    dowShort: {
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
      sun: string;
    };
    /** Tên thứ đầy đủ, dùng trong bảng và ô chọn. */
    dowLong: {
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
      sun: string;
    };

    /** Tiền tố tháng nhuận âm lịch. Bản `Short` dùng trong ô lịch tháng. */
    lunarLeap: string;
    lunarLeapShort: string;
  };

  login: {
    title: string;
    subtitle: string;
    username: string;
    usernamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    showPassword: string;
    hidePassword: string;
    submit: string;
    submitting: string;
    forgotPassword: string;
    /** Hiện khi để trống username hoặc password. */
    missingCredentials: string;
    /** Hiện khi backend trả HTTP 401. */
    invalidCredentials: string;

    forgot: {
      title: string;
      subtitle: string;
      sendOtp: string;
      sending: string;
      backToLogin: string;
      missingUsername: string;
      sendOtpFailed: string;
    };

    reset: {
      title: string;
      /** Có tham số {{email}} — dùng chung cho cả hai ngôn ngữ. */
      subtitle: string;
      fallbackEmail: string;
      otp: string;
      otpPlaceholder: string;
      newPassword: string;
      newPasswordPlaceholder: string;
      submit: string;
      submitting: string;
      resend: string;
      missingFields: string;
      failed: string;
      /** Nối sau message thành công của backend. */
      loginWithNewPassword: string;
    };
  };

  visitor: {
    title: string;
    subtitle: string;

    /* --- Bộ lọc --- */
    dateRange: string;
    range7: string;
    range30: string;
    range90: string;
    rangeAll: string;
    area: string;
    areaAll: string;
    areaLogin: string;
    pathContains: string;
    pathPlaceholder: string;
    hideSelf: string;
    hideBots: string;
    apply: string;
    /** Có tham số {{id}}. */
    viewingVisitor: string;
    clearVisitorFilter: string;

    /* --- Tab --- */
    tabOverview: string;
    tabVisits: string;
    tabVisitors: string;
    tabMyIps: string;

    /* --- Tổng quan --- */
    kpiViews: string;
    kpiVisitors: string;
    kpiReturning: string;
    kpiReturningHint: string;
    kpiSessions: string;
    kpiAvgDuration: string;
    kpiFailedLogins: string;
    /** Có tham số {{count}}. */
    kpiLoginAttempts: string;
    chartViewsByDay: string;
    chartLongTerm: string;
    rankTopPages: string;
    rankReferrers: string;
    rankCountries: string;
    rankDevices: string;
    rankBrowsers: string;
    noData: string;
    /** Trong khung biểu đồ, khi khoảng thời gian không có số liệu. */
    chartEmpty: string;
    /** Tooltip cột biểu đồ; tham số {{views}} và {{visitors}}. */
    chartBarTooltip: string;

    /* --- Bảng lượt truy cập --- */
    /**
     * Chỉ là DANH TỪ đứng sau con số, không phải câu có tham số: con số được bọc
     * trong `<strong>` ở template nên phải nằm ngoài chuỗi dịch. Cả vi lẫn en đều
     * đặt số trước danh từ nên cách này an toàn.
     */
    visitCountLabel: string;
    /** Có tham số {{page}} và {{total}}. */
    pageIndicator: string;
    perPage: string;
    colTime: string;
    colPath: string;
    colIp: string;
    colLocation: string;
    colReferrer: string;
    colBrowser: string;
    colDevice: string;
    colReadTime: string;
    colActions: string;
    emptyVisits: string;
    eventPageView: string;
    eventLoginOk: string;
    eventLoginFail: string;
    /** Nhãn mặc định khi một IP được đánh dấu là của mình mà chưa đặt tên. */
    mine: string;
    viewVisitorTitle: string;
    viewVisitorButton: string;
    markMineTitle: string;
    markMineButton: string;
    pagePrev: string;
    pageNext: string;

    /* --- Bảng khách --- */
    /** Danh từ đứng sau con số, xem ghi chú ở `visitCountLabel`. */
    visitorCountLabel: string;
    visitorCountHint: string;
    colViews: string;
    colSessions: string;
    colPages: string;
    colFirstSeen: string;
    colLastSeen: string;
    badgeReturning: string;
    emptyVisitors: string;
    visitorDetailTitle: string;
    visitorDetailButton: string;
    markMineVisitorTitle: string;
    /** Hộp thoại prompt; tham số {{ip}}. */
    promptNameIp: string;
    /** Hộp thoại prompt; tham số {{ip}}. */
    promptNameVisitor: string;

    /* --- IP của tôi --- */
    knownIpIntro: string;
    newIpPlaceholder: string;
    newLabelPlaceholder: string;
    addIp: string;
    missingIp: string;
    addIpFailed: string;
    colVisitorId: string;
    colLabel: string;
    colIsSelf: string;
    colCreatedDate: string;
    emptyKnownIps: string;
    yes: string;
    no: string;
    unmark: string;
    markSelf: string;
    delete: string;
    /** Hộp thoại confirm; tham số {{target}}. */
    confirmDeleteKnownIp: string;

    /** Nhãn dẫn nguồn. Tên "IP Geolocation by DB-IP" KHÔNG dịch (giấy phép CC-BY). */
    locationDataBy: string;
  };
};

/** Các ngôn ngữ app hỗ trợ. Thêm ngôn ngữ mới thì thêm vào đây trước. */
export const LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Tiếng Việt là ngôn ngữ gốc của app nên cũng là fallback. */
export const DEFAULT_LANGUAGE: Language = 'vi';

/**
 * Locale đầy đủ cho DatePipe/CurrencyPipe. Phải truyền tường minh vào từng pipe
 * vì `LOCALE_ID` bị cố định lúc bootstrap, không đổi theo runtime.
 */
export const LOCALE_BY_LANGUAGE: Record<Language, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
