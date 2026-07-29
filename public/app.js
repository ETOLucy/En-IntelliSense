const $ = selector => document.querySelector(selector);
const editor = $('#editor');
const mirror = $('#editorMirror');
const mirrorText = $('#mirrorText');
const ghostText = $('#ghostText');
const autocompleteStatus = $('#autocompleteStatus');
const modelThinking = $('#modelThinking');
const suggestionBar = $('#suggestionBar');
const wordCount = $('#wordCount');
const saveStatus = $('#saveStatus');
const toast = $('#toast');
const LEGACY_STORAGE_KEYS = ['enwrite-draft', 'enwrite-finished', 'enwrite-custom-provider', 'enwrite-explanation-language'];
const STORAGE_MIGRATION_KEY = 'enwrite-storage-isolation-v1';
let storageScope = 'local';

function modelRequestHeaders() {
  const accessToken = sessionStorage.getItem('writemelo-access-token') || '';
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

const SETTINGS_I18N = {
  en: { ui_language: 'Interface language', ai_service: 'AI service', subscription_mode: 'Subscription - recommended for learners', developer_mode: 'Custom model service - for developers', subscription_code: 'Subscription code', subscription_help: 'Enter the code from your purchase. No model setup is required.', show: 'Show', developer_help: 'Connect a model service with a compatible Chat Completions or Responses endpoint.', api_endpoint: 'API endpoint', api_key: 'API key', api_key_help: 'Encrypted for your Windows account and never included in the app package.', main_model: 'Review and chat model ID', fast_model: 'Autocomplete model ID', api_protocol: 'Compatible API protocol', test_connection: 'Test connection', save_settings: 'Save settings' },
  zh: { ui_language: '界面语言', ai_service: 'AI 服务', subscription_mode: '订阅版 - 推荐英语学习者', developer_mode: '自定义模型服务 - 面向开发者', subscription_code: '订阅码', subscription_help: '输入购买后获得的订阅码，无需配置模型。', show: '显示', developer_help: '连接提供兼容 Chat Completions 或 Responses 接口的模型服务。', api_endpoint: 'API 接口地址', api_key: 'API Key', api_key_help: '使用当前 Windows 账户加密，不会写入安装包。', main_model: '审查与聊天模型 ID', fast_model: '自动补全模型 ID', api_protocol: '兼容 API 协议', test_connection: '测试连接', save_settings: '保存设置' },
  es: { ui_language: 'Idioma de la interfaz', ai_service: 'Servicio de IA', subscription_mode: 'Suscripción - recomendada para estudiantes', developer_mode: 'Servicio personalizado - para desarrolladores', subscription_code: 'Código de suscripción', subscription_help: 'Introduce el código de compra. No necesitas configurar modelos.', show: 'Mostrar', developer_help: 'Conecta un servicio con un endpoint compatible.', api_endpoint: 'Endpoint de API', api_key: 'Clave API', api_key_help: 'Cifrada para tu cuenta de Windows.', main_model: 'ID del modelo principal', fast_model: 'ID del modelo de autocompletado', api_protocol: 'Protocolo compatible', test_connection: 'Probar conexión', save_settings: 'Guardar' },
  ja: { ui_language: '表示言語', ai_service: 'AI サービス', subscription_mode: 'サブスクリプション - 学習者向け', developer_mode: 'カスタムモデル - 開発者向け', subscription_code: 'サブスクリプションコード', subscription_help: '購入時のコードを入力してください。モデル設定は不要です。', show: '表示', developer_help: '互換エンドポイントを持つモデルサービスに接続します。', api_endpoint: 'API エンドポイント', api_key: 'API キー', api_key_help: 'Windows アカウント用に暗号化されます。', main_model: 'メインモデル ID', fast_model: '補完モデル ID', api_protocol: '互換 API プロトコル', test_connection: '接続テスト', save_settings: '保存' },
  ko: { ui_language: '인터페이스 언어', ai_service: 'AI 서비스', subscription_mode: '구독 - 학습자에게 권장', developer_mode: '사용자 지정 모델 - 개발자용', subscription_code: '구독 코드', subscription_help: '구매 코드를 입력하세요. 모델 설정은 필요하지 않습니다.', show: '표시', developer_help: '호환 엔드포인트를 제공하는 모델 서비스에 연결합니다.', api_endpoint: 'API 엔드포인트', api_key: 'API 키', api_key_help: 'Windows 계정으로 암호화됩니다.', main_model: '기본 모델 ID', fast_model: '자동 완성 모델 ID', api_protocol: '호환 API 프로토콜', test_connection: '연결 테스트', save_settings: '저장' },
  fr: { ui_language: "Langue de l'interface", ai_service: "Service d'IA", subscription_mode: 'Abonnement - recommandé aux apprenants', developer_mode: 'Service personnalisé - développeurs', subscription_code: "Code d'abonnement", subscription_help: 'Saisissez le code reçu après achat. Aucun modèle à configurer.', show: 'Afficher', developer_help: 'Connectez un service de modèle avec un endpoint compatible.', api_endpoint: 'Point de terminaison API', api_key: 'Clé API', api_key_help: 'Chiffrée pour votre compte Windows.', main_model: 'ID du modèle principal', fast_model: "ID du modèle d'autocomplétion", api_protocol: 'Protocole compatible', test_connection: 'Tester', save_settings: 'Enregistrer' },
  de: { ui_language: 'Oberflächensprache', ai_service: 'KI-Dienst', subscription_mode: 'Abonnement - für Lernende empfohlen', developer_mode: 'Eigener Modelldienst - für Entwickler', subscription_code: 'Abonnementcode', subscription_help: 'Kaufcode eingeben. Keine Modellkonfiguration nötig.', show: 'Anzeigen', developer_help: 'Einen Modelldienst mit kompatiblem Endpunkt verbinden.', api_endpoint: 'API-Endpunkt', api_key: 'API-Schlüssel', api_key_help: 'Für Ihr Windows-Konto verschlüsselt.', main_model: 'Hauptmodell-ID', fast_model: 'Vervollständigungsmodell-ID', api_protocol: 'Kompatibles API-Protokoll', test_connection: 'Verbindung testen', save_settings: 'Speichern' },
  pt: { ui_language: 'Idioma da interface', ai_service: 'Serviço de IA', subscription_mode: 'Assinatura - recomendada para estudantes', developer_mode: 'Serviço personalizado - desenvolvedores', subscription_code: 'Código da assinatura', subscription_help: 'Insira o código da compra. Não é preciso configurar modelos.', show: 'Mostrar', developer_help: 'Conecte um serviço de modelo com endpoint compatível.', api_endpoint: 'Endpoint da API', api_key: 'Chave API', api_key_help: 'Criptografada para sua conta do Windows.', main_model: 'ID do modelo principal', fast_model: 'ID do modelo de preenchimento', api_protocol: 'Protocolo compatível', test_connection: 'Testar conexão', save_settings: 'Salvar' },
  ar: { ui_language: 'لغة الواجهة', ai_service: 'خدمة الذكاء الاصطناعي', subscription_mode: 'الاشتراك - موصى به للمتعلمين', developer_mode: 'خدمة نموذج مخصصة - للمطورين', subscription_code: 'رمز الاشتراك', subscription_help: 'أدخل رمز الشراء. لا يلزم إعداد نموذج.', show: 'إظهار', developer_help: 'اتصل بخدمة نموذج توفر نقطة نهاية متوافقة.', api_endpoint: 'عنوان API', api_key: 'مفتاح API', api_key_help: 'مشفّر لحساب Windows الخاص بك.', main_model: 'معرّف النموذج الرئيسي', fast_model: 'معرّف نموذج الإكمال', api_protocol: 'بروتوكول API متوافق', test_connection: 'اختبار الاتصال', save_settings: 'حفظ' },
  hi: { ui_language: 'इंटरफ़ेस भाषा', ai_service: 'AI सेवा', subscription_mode: 'सदस्यता - शिक्षार्थियों के लिए', developer_mode: 'कस्टम मॉडल - डेवलपर के लिए', subscription_code: 'सदस्यता कोड', subscription_help: 'खरीद का कोड दर्ज करें। मॉडल सेटअप आवश्यक नहीं है।', show: 'दिखाएँ', developer_help: 'संगत एंडपॉइंट वाली मॉडल सेवा जोड़ें।', api_endpoint: 'API endpoint', api_key: 'API key', api_key_help: 'आपके Windows खाते के लिए एन्क्रिप्ट किया गया।', main_model: 'मुख्य मॉडल ID', fast_model: 'ऑटोकम्प्लीट मॉडल ID', api_protocol: 'संगत API प्रोटोकॉल', test_connection: 'कनेक्शन जाँचें', save_settings: 'सेव करें' },
  ru: { ui_language: 'Язык интерфейса', ai_service: 'Сервис ИИ', subscription_mode: 'Подписка - для изучающих язык', developer_mode: 'Свой сервис модели - для разработчиков', subscription_code: 'Код подписки', subscription_help: 'Введите код покупки. Настройка модели не требуется.', show: 'Показать', developer_help: 'Подключите сервис модели с совместимой конечной точкой.', api_endpoint: 'Адрес API', api_key: 'Ключ API', api_key_help: 'Зашифрован для вашей учётной записи Windows.', main_model: 'ID основной модели', fast_model: 'ID модели автодополнения', api_protocol: 'Совместимый протокол API', test_connection: 'Проверить', save_settings: 'Сохранить' }
};

const COMMERCE_I18N = {
  en: { app_preferences: 'APP PREFERENCES', language_region: 'Language and region', system_default: 'System default', language_available: 'Only languages with reviewed interface translations are listed.', save: 'Save', plans_ai: 'Plans and AI service', free_description: 'Use your own compatible model service and API key. WriteMelo does not charge for model usage.', setup_api_key: 'Set up my API key', plus_description: 'AI autocomplete, writing coach, review, and 10,000 monthly usage units.', choose_plus: 'Choose Plus', pro_description: 'Higher limits, up to five devices, and 30,000 monthly usage units.', choose_pro: 'Choose Pro', already_subscribed: 'Already subscribed?', restore_description: 'Restore a Microsoft Store purchase or enter a support-issued code.', recovery_code: 'Subscription or recovery code', store_restore_pending: 'Store purchase restoration will appear here after Partner Center is connected.', own_model_service: 'Use my own model service', advanced_setup: 'Advanced setup for compatible providers', advanced_note: 'For advanced users who already have an API key. This is separate from an WriteMelo subscription.', view_store: 'View in Microsoft Store', store_not_configured: 'Microsoft Store purchasing is not configured in this build.' },
  zh: { app_preferences: '应用偏好', language_region: '语言和地区', system_default: '跟随系统', language_available: '这里只列出已经完成并审核界面翻译的语言。', save: '保存', plans_ai: '套餐与 AI 服务', free_description: '使用你自己的兼容模型服务和 API Key，WriteMelo 不收取模型使用费。', setup_api_key: '配置我的 API Key', plus_description: '包含 AI 自动补全、写作教练、审查和每月 10,000 使用单位。', choose_plus: '选择 Plus', pro_description: '更高额度、最多五台设备和每月 30,000 使用单位。', choose_pro: '选择 Pro', already_subscribed: '已经订阅？', restore_description: '恢复 Microsoft Store 购买，或输入客服提供的恢复码。', recovery_code: '订阅或恢复码', store_restore_pending: '连接 Partner Center 后可在这里恢复商店购买。', own_model_service: '使用我自己的模型服务', advanced_setup: '兼容模型提供商的高级设置', advanced_note: '适合已有 API Key 的高级用户，与 WriteMelo 订阅相互独立。', view_store: '在 Microsoft Store 中查看', store_not_configured: '此调试版本尚未配置 Microsoft Store 购买。' },
  es: { app_preferences: 'PREFERENCIAS', language_region: 'Idioma y región', system_default: 'Idioma del sistema', language_available: 'Solo se muestran idiomas con traducciones revisadas.', save: 'Guardar', plans_ai: 'Planes y servicio de IA', free_description: 'Usa tu propio servicio compatible y clave API. WriteMelo no cobra por el uso del modelo.', setup_api_key: 'Configurar mi clave API', plus_description: 'Autocompletado, asistente, revisión y 10.000 unidades mensuales.', choose_plus: 'Elegir Plus', pro_description: 'Límites mayores, hasta cinco dispositivos y 30.000 unidades mensuales.', choose_pro: 'Elegir Pro', already_subscribed: '¿Ya tienes una suscripción?', restore_description: 'Restaura una compra de Microsoft Store o introduce un código de recuperación.', recovery_code: 'Código de suscripción o recuperación', store_restore_pending: 'La restauración estará disponible al conectar Partner Center.', own_model_service: 'Usar mi propio servicio de modelos', advanced_setup: 'Configuración avanzada para proveedores compatibles', advanced_note: 'Para usuarios avanzados con clave API. Es independiente de la suscripción.', view_store: 'Ver en Microsoft Store', store_not_configured: 'Las compras de Microsoft Store no están configuradas en esta compilación.' },
  ja: { app_preferences: 'アプリ設定', language_region: '言語と地域', system_default: 'システム設定', language_available: '確認済みの画面翻訳がある言語のみ表示します。', save: '保存', plans_ai: 'プランと AI サービス', free_description: '自分の互換モデルサービスと API キーを使用します。モデル利用料は請求しません。', setup_api_key: 'API キーを設定', plus_description: 'AI 補完、ライティング支援、レビュー、月 10,000 利用単位。', choose_plus: 'Plus を選択', pro_description: '上限拡大、最大 5 台、月 30,000 利用単位。', choose_pro: 'Pro を選択', already_subscribed: '購読済みですか？', restore_description: 'Microsoft Store の購入を復元するか、復旧コードを入力します。', recovery_code: '購読または復旧コード', store_restore_pending: 'Partner Center 接続後に購入を復元できます。', own_model_service: '自分のモデルサービスを使う', advanced_setup: '互換プロバイダー向け詳細設定', advanced_note: 'API キーを持つ上級ユーザー向けで、購読とは独立しています。', view_store: 'Microsoft Store で表示', store_not_configured: 'このビルドでは Microsoft Store 購入が未設定です。' },
  ko: { app_preferences: '앱 환경설정', language_region: '언어 및 지역', system_default: '시스템 기본값', language_available: '검토가 완료된 인터페이스 번역만 표시됩니다.', save: '저장', plans_ai: '요금제 및 AI 서비스', free_description: '자신의 호환 모델 서비스와 API 키를 사용합니다. 모델 사용료는 청구하지 않습니다.', setup_api_key: '내 API 키 설정', plus_description: 'AI 자동 완성, 쓰기 도우미, 검토 및 월 10,000 사용 단위.', choose_plus: 'Plus 선택', pro_description: '더 높은 한도, 최대 5대 기기 및 월 30,000 사용 단위.', choose_pro: 'Pro 선택', already_subscribed: '이미 구독 중인가요?', restore_description: 'Microsoft Store 구매를 복원하거나 복구 코드를 입력하세요.', recovery_code: '구독 또는 복구 코드', store_restore_pending: 'Partner Center 연결 후 구매 복원을 사용할 수 있습니다.', own_model_service: '내 모델 서비스 사용', advanced_setup: '호환 제공업체를 위한 고급 설정', advanced_note: 'API 키가 있는 고급 사용자용이며 구독과 별개입니다.', view_store: 'Microsoft Store에서 보기', store_not_configured: '이 빌드에는 Microsoft Store 구매가 설정되지 않았습니다.' },
  fr: { app_preferences: 'PRÉFÉRENCES', language_region: 'Langue et région', system_default: 'Langue du système', language_available: "Seules les langues dont l'interface a été relue sont proposées.", save: 'Enregistrer', plans_ai: "Offres et service d'IA", free_description: "Utilisez votre propre service compatible et votre clé API. WriteMelo ne facture pas l'utilisation du modèle.", setup_api_key: 'Configurer ma clé API', plus_description: 'Autocomplétion, coach, révision et 10 000 unités mensuelles.', choose_plus: 'Choisir Plus', pro_description: 'Limites supérieures, cinq appareils et 30 000 unités mensuelles.', choose_pro: 'Choisir Pro', already_subscribed: 'Déjà abonné ?', restore_description: 'Restaurez un achat Microsoft Store ou saisissez un code de récupération.', recovery_code: "Code d'abonnement ou de récupération", store_restore_pending: 'La restauration sera disponible après la connexion à Partner Center.', own_model_service: 'Utiliser mon propre service de modèles', advanced_setup: 'Configuration avancée pour les fournisseurs compatibles', advanced_note: "Pour les utilisateurs avancés disposant d'une clé API, indépendamment de l'abonnement.", view_store: 'Voir dans Microsoft Store', store_not_configured: "Les achats Microsoft Store ne sont pas configurés dans cette version." },
  de: { app_preferences: 'APP-EINSTELLUNGEN', language_region: 'Sprache und Region', system_default: 'Systemstandard', language_available: 'Nur Sprachen mit geprüfter Übersetzung werden angeboten.', save: 'Speichern', plans_ai: 'Tarife und KI-Dienst', free_description: 'Eigenen kompatiblen Modelldienst und API-Schlüssel verwenden. WriteMelo berechnet keine Modellnutzung.', setup_api_key: 'API-Schlüssel einrichten', plus_description: 'KI-Vervollständigung, Schreibcoach, Prüfung und 10.000 Einheiten monatlich.', choose_plus: 'Plus wählen', pro_description: 'Höhere Limits, bis zu fünf Geräte und 30.000 Einheiten monatlich.', choose_pro: 'Pro wählen', already_subscribed: 'Bereits abonniert?', restore_description: 'Microsoft Store-Kauf wiederherstellen oder Wiederherstellungscode eingeben.', recovery_code: 'Abo- oder Wiederherstellungscode', store_restore_pending: 'Die Wiederherstellung ist nach Verbindung mit Partner Center verfügbar.', own_model_service: 'Eigenen Modelldienst verwenden', advanced_setup: 'Erweiterte Einrichtung für kompatible Anbieter', advanced_note: 'Für erfahrene Nutzer mit API-Schlüssel, unabhängig vom Abonnement.', view_store: 'Im Microsoft Store anzeigen', store_not_configured: 'Microsoft Store-Käufe sind in diesem Build nicht konfiguriert.' },
  pt: { app_preferences: 'PREFERÊNCIAS', language_region: 'Idioma e região', system_default: 'Padrão do sistema', language_available: 'Somente idiomas com tradução revisada são exibidos.', save: 'Salvar', plans_ai: 'Planos e serviço de IA', free_description: 'Use seu próprio serviço compatível e chave de API. O WriteMelo não cobra pelo uso do modelo.', setup_api_key: 'Configurar minha chave API', plus_description: 'Preenchimento por IA, assistente, revisão e 10.000 unidades mensais.', choose_plus: 'Escolher Plus', pro_description: 'Limites maiores, até cinco dispositivos e 30.000 unidades mensais.', choose_pro: 'Escolher Pro', already_subscribed: 'Já é assinante?', restore_description: 'Restaure uma compra da Microsoft Store ou informe um código de recuperação.', recovery_code: 'Código de assinatura ou recuperação', store_restore_pending: 'A restauração estará disponível após conectar o Partner Center.', own_model_service: 'Usar meu próprio serviço de modelo', advanced_setup: 'Configuração avançada para provedores compatíveis', advanced_note: 'Para usuários avançados com chave API, separado da assinatura.', view_store: 'Ver na Microsoft Store', store_not_configured: 'As compras da Microsoft Store não estão configuradas nesta versão.' },
  ar: { app_preferences: 'تفضيلات التطبيق', language_region: 'اللغة والمنطقة', system_default: 'لغة النظام', language_available: 'تظهر فقط اللغات ذات الترجمة المراجعة.', save: 'حفظ', plans_ai: 'الخطط وخدمة الذكاء الاصطناعي', free_description: 'استخدم خدمة نموذج متوافقة ومفتاح API خاصين بك. لا يفرض التطبيق رسوماً على استخدام النموذج.', setup_api_key: 'إعداد مفتاح API', plus_description: 'إكمال ذكي ومدرب كتابة ومراجعة و10,000 وحدة شهرياً.', choose_plus: 'اختيار Plus', pro_description: 'حدود أعلى وحتى خمسة أجهزة و30,000 وحدة شهرياً.', choose_pro: 'اختيار Pro', already_subscribed: 'مشترك بالفعل؟', restore_description: 'استعد شراء Microsoft Store أو أدخل رمز الاسترداد.', recovery_code: 'رمز الاشتراك أو الاسترداد', store_restore_pending: 'يتاح الاسترداد بعد ربط Partner Center.', own_model_service: 'استخدام خدمة النموذج الخاصة بي', advanced_setup: 'إعداد متقدم لموفري الخدمات المتوافقة', advanced_note: 'للمستخدمين المتقدمين الذين لديهم مفتاح API، وهو منفصل عن الاشتراك.', view_store: 'عرض في Microsoft Store', store_not_configured: 'شراء Microsoft Store غير مهيأ في هذا الإصدار.' },
  hi: { app_preferences: 'ऐप प्राथमिकताएं', language_region: 'भाषा और क्षेत्र', system_default: 'सिस्टम डिफ़ॉल्ट', language_available: 'केवल समीक्षा किए गए अनुवाद वाली भाषाएं दिखाई जाती हैं।', save: 'सेव करें', plans_ai: 'प्लान और AI सेवा', free_description: 'अपनी संगत मॉडल सेवा और API key का उपयोग करें। WriteMelo मॉडल उपयोग का शुल्क नहीं लेता।', setup_api_key: 'मेरी API key सेट करें', plus_description: 'AI ऑटोकम्प्लीट, लेखन सहायक, समीक्षा और 10,000 मासिक यूनिट।', choose_plus: 'Plus चुनें', pro_description: 'अधिक सीमा, पांच डिवाइस तक और 30,000 मासिक यूनिट।', choose_pro: 'Pro चुनें', already_subscribed: 'पहले से सदस्य हैं?', restore_description: 'Microsoft Store खरीद बहाल करें या रिकवरी कोड डालें।', recovery_code: 'सदस्यता या रिकवरी कोड', store_restore_pending: 'Partner Center जुड़ने के बाद बहाली उपलब्ध होगी।', own_model_service: 'अपनी मॉडल सेवा उपयोग करें', advanced_setup: 'संगत प्रदाताओं के लिए उन्नत सेटअप', advanced_note: 'API key वाले उन्नत उपयोगकर्ताओं के लिए, सदस्यता से अलग।', view_store: 'Microsoft Store में देखें', store_not_configured: 'इस बिल्ड में Microsoft Store खरीद कॉन्फ़िगर नहीं है।' },
  ru: { app_preferences: 'НАСТРОЙКИ ПРИЛОЖЕНИЯ', language_region: 'Язык и регион', system_default: 'Системный язык', language_available: 'Показаны только языки с проверенным переводом.', save: 'Сохранить', plans_ai: 'Тарифы и сервис ИИ', free_description: 'Используйте собственный совместимый сервис и ключ API. WriteMelo не взимает плату за модель.', setup_api_key: 'Настроить мой ключ API', plus_description: 'ИИ-дополнение, помощник, проверка и 10 000 единиц в месяц.', choose_plus: 'Выбрать Plus', pro_description: 'Повышенные лимиты, до пяти устройств и 30 000 единиц в месяц.', choose_pro: 'Выбрать Pro', already_subscribed: 'Уже подписаны?', restore_description: 'Восстановите покупку Microsoft Store или введите код восстановления.', recovery_code: 'Код подписки или восстановления', store_restore_pending: 'Восстановление станет доступно после подключения Partner Center.', own_model_service: 'Использовать свой сервис модели', advanced_setup: 'Расширенная настройка совместимых поставщиков', advanced_note: 'Для опытных пользователей с ключом API, отдельно от подписки.', view_store: 'Открыть в Microsoft Store', store_not_configured: 'Покупки Microsoft Store не настроены в этой сборке.' }
};

const APP_I18N = {
  en: { new_draft: 'New draft', workspace: 'WORKSPACE', drafts: 'Drafts', finished: 'Finished', writing_settings: 'Writing settings', format: 'Format', audience: 'Audience', my_english: 'My English', explanations: 'Explanations', completion: 'Completion', tone: 'Tone', writing_coach: 'Writing coach', coach: 'Coach', ask_ai: 'Ask AI', live_review: 'LIVE REVIEW', review: 'Review' },
  zh: { new_draft: '新建草稿', workspace: '工作区', drafts: '草稿', finished: '已完成', writing_settings: '写作设置', format: '文体', audience: '读者', my_english: '我的英语水平', explanations: '讲解语言', completion: '自动补全', tone: '语气', writing_coach: '写作教练', coach: '建议', ask_ai: '问 AI', live_review: '实时检查', review: '检查' },
  es: { new_draft: 'Nuevo borrador', workspace: 'ESPACIO DE TRABAJO', drafts: 'Borradores', finished: 'Terminados', writing_settings: 'Ajustes de escritura', format: 'Formato', audience: 'Destinatario', my_english: 'Mi nivel de inglés', explanations: 'Explicaciones', completion: 'Autocompletado', tone: 'Tono', writing_coach: 'Asistente de escritura', coach: 'Consejos', ask_ai: 'Preguntar a IA', live_review: 'REVISIÓN EN VIVO', review: 'Revisar' },
  ja: { new_draft: '新規下書き', workspace: 'ワークスペース', drafts: '下書き', finished: '完了', writing_settings: '文章設定', format: '形式', audience: '読み手', my_english: '英語レベル', explanations: '解説言語', completion: '自動補完', tone: 'トーン', writing_coach: 'ライティングコーチ', coach: 'コーチ', ask_ai: 'AI に質問', live_review: 'ライブレビュー', review: 'レビュー' },
  ko: { new_draft: '새 초안', workspace: '작업 공간', drafts: '초안', finished: '완료', writing_settings: '쓰기 설정', format: '형식', audience: '독자', my_english: '내 영어 수준', explanations: '설명 언어', completion: '자동 완성', tone: '어조', writing_coach: '쓰기 코치', coach: '코치', ask_ai: 'AI에게 질문', live_review: '실시간 검토', review: '검토' },
  fr: { new_draft: 'Nouveau brouillon', workspace: 'ESPACE DE TRAVAIL', drafts: 'Brouillons', finished: 'Terminés', writing_settings: "Réglages d'écriture", format: 'Format', audience: 'Destinataire', my_english: "Mon niveau d'anglais", explanations: 'Explications', completion: 'Saisie assistée', tone: 'Ton', writing_coach: "Coach d'écriture", coach: 'Coach', ask_ai: "Demander à l'IA", live_review: 'RÉVISION EN DIRECT', review: 'Réviser' },
  de: { new_draft: 'Neuer Entwurf', workspace: 'ARBEITSBEREICH', drafts: 'Entwürfe', finished: 'Fertig', writing_settings: 'Schreibeinstellungen', format: 'Format', audience: 'Zielgruppe', my_english: 'Mein Englischniveau', explanations: 'Erklärungen', completion: 'Vervollständigung', tone: 'Ton', writing_coach: 'Schreibcoach', coach: 'Coach', ask_ai: 'KI fragen', live_review: 'LIVE-PRÜFUNG', review: 'Prüfen' },
  pt: { new_draft: 'Novo rascunho', workspace: 'ESPAÇO DE TRABALHO', drafts: 'Rascunhos', finished: 'Concluídos', writing_settings: 'Configurações de escrita', format: 'Formato', audience: 'Público', my_english: 'Meu nível de inglês', explanations: 'Explicações', completion: 'Preenchimento', tone: 'Tom', writing_coach: 'Assistente de escrita', coach: 'Assistente', ask_ai: 'Perguntar à IA', live_review: 'REVISÃO AO VIVO', review: 'Revisar' },
  ar: { new_draft: 'مسودة جديدة', workspace: 'مساحة العمل', drafts: 'المسودات', finished: 'المكتملة', writing_settings: 'إعدادات الكتابة', format: 'النوع', audience: 'الجمهور', my_english: 'مستواي في الإنجليزية', explanations: 'لغة الشرح', completion: 'الإكمال', tone: 'النبرة', writing_coach: 'مدرب الكتابة', coach: 'المدرب', ask_ai: 'اسأل الذكاء الاصطناعي', live_review: 'مراجعة مباشرة', review: 'مراجعة' },
  hi: { new_draft: 'नया ड्राफ़्ट', workspace: 'कार्यस्थान', drafts: 'ड्राफ़्ट', finished: 'पूर्ण', writing_settings: 'लेखन सेटिंग', format: 'प्रारूप', audience: 'पाठक', my_english: 'मेरा अंग्रेज़ी स्तर', explanations: 'व्याख्या भाषा', completion: 'स्वतः पूर्ण', tone: 'लहजा', writing_coach: 'लेखन सहायक', coach: 'सहायक', ask_ai: 'AI से पूछें', live_review: 'लाइव समीक्षा', review: 'समीक्षा' },
  ru: { new_draft: 'Новый черновик', workspace: 'РАБОЧАЯ ОБЛАСТЬ', drafts: 'Черновики', finished: 'Готовые', writing_settings: 'Настройки письма', format: 'Формат', audience: 'Аудитория', my_english: 'Мой уровень английского', explanations: 'Язык пояснений', completion: 'Автодополнение', tone: 'Тон', writing_coach: 'Помощник по письму', coach: 'Советы', ask_ai: 'Спросить ИИ', live_review: 'ПРОВЕРКА', review: 'Проверить' }
};

const DETAIL_I18N = {
  en: { format_letter: 'Letter or email', format_essay: 'Essay', format_message: 'Short message', audience_friend: 'A friend', audience_colleague: 'A colleague', audience_teacher: 'A teacher', audience_customer: 'A customer', audience_general: 'General reader', level_simple: 'Simple', level_natural: 'Natural', level_advanced: 'Advanced', completion_auto: 'Auto', completion_word: 'Word', completion_phrase: 'Phrase', completion_sentence: 'Sentence', tone_warm: 'Warm and friendly', tone_professional: 'Professional', tone_casual: 'Casual', tone_confident: 'Confident', writing_flow: 'Writing flow', flow_start: 'Start writing', flow_shape: 'Taking shape', flow_good: 'Good', flow_note_start: 'Add a few more words to see writing feedback.', flow_note_shape: 'Your idea is taking shape. Keep developing it.', flow_note_good: 'Your writing feels clear and easy to follow.', no_issues: 'No clear issues', no_issues_note: 'The draft reads naturally for its current level.', no_issues_yet: 'No issues yet', no_issues_yet_note: 'Keep writing and the coach will review your draft.', useful_phrases: 'Useful phrases', review_wait: 'Pause after writing and the coach will review the draft.', store_price: 'Store price', save_ai: 'Save AI service' },
  zh: { format_letter: '信件或邮件', format_essay: '文章', format_message: '短消息', audience_friend: '朋友', audience_colleague: '同事', audience_teacher: '老师', audience_customer: '客户', audience_general: '普通读者', level_simple: '简单', level_natural: '自然', level_advanced: '高级', completion_auto: '自动', completion_word: '单词', completion_phrase: '短语', completion_sentence: '句子', tone_warm: '热情友好', tone_professional: '专业', tone_casual: '随意', tone_confident: '自信', writing_flow: '行文流畅度', flow_start: '开始写作', flow_shape: '逐渐成形', flow_good: '良好', flow_note_start: '再写一些内容后即可查看写作反馈。', flow_note_shape: '你的想法正在成形，请继续展开。', flow_note_good: '文章清晰流畅，容易理解。', no_issues: '未发现明显问题', no_issues_note: '这份草稿以当前难度来看表达自然。', no_issues_yet: '暂未检查', no_issues_yet_note: '继续写作，写作教练会检查你的草稿。', useful_phrases: '实用短语', review_wait: '停止输入片刻后，写作教练会检查草稿。', store_price: '商店价格', save_ai: '保存 AI 服务' },
  es: { format_letter: 'Carta o correo', format_essay: 'Ensayo', format_message: 'Mensaje corto', audience_friend: 'Un amigo', audience_colleague: 'Un colega', audience_teacher: 'Un profesor', audience_customer: 'Un cliente', audience_general: 'Público general', level_simple: 'Simple', level_natural: 'Natural', level_advanced: 'Avanzado', completion_auto: 'Auto', completion_word: 'Palabra', completion_phrase: 'Frase', completion_sentence: 'Oración', tone_warm: 'Cálido y amable', tone_professional: 'Profesional', tone_casual: 'Informal', tone_confident: 'Seguro', writing_flow: 'Fluidez', flow_start: 'Empieza a escribir', flow_shape: 'Va tomando forma', flow_good: 'Bien', flow_note_start: 'Escribe un poco más para ver comentarios.', flow_note_shape: 'Tu idea va tomando forma. Sigue desarrollándola.', flow_note_good: 'El texto es claro y fácil de seguir.', no_issues: 'No hay problemas claros', no_issues_note: 'El borrador suena natural para el nivel actual.', no_issues_yet: 'Aún sin problemas', no_issues_yet_note: 'Sigue escribiendo y el asistente revisará el borrador.', useful_phrases: 'Frases útiles', review_wait: 'Haz una pausa y el asistente revisará el borrador.', store_price: 'Precio de la tienda', save_ai: 'Guardar servicio de IA' },
  ja: { format_letter: '手紙またはメール', format_essay: '作文', format_message: '短いメッセージ', audience_friend: '友人', audience_colleague: '同僚', audience_teacher: '先生', audience_customer: '顧客', audience_general: '一般の読者', level_simple: '簡単', level_natural: '自然', level_advanced: '上級', completion_auto: '自動', completion_word: '単語', completion_phrase: 'フレーズ', completion_sentence: '文', tone_warm: '温かく親しみやすい', tone_professional: '丁寧', tone_casual: 'カジュアル', tone_confident: '自信のある', writing_flow: '文章の流れ', flow_start: '書き始めましょう', flow_shape: '形になってきました', flow_good: '良好', flow_note_start: 'もう少し書くとフィードバックが表示されます。', flow_note_shape: '考えが形になってきました。さらに書き進めましょう。', flow_note_good: '明確で読みやすい文章です。', no_issues: '明確な問題はありません', no_issues_note: '現在のレベルに合った自然な文章です。', no_issues_yet: 'まだ問題はありません', no_issues_yet_note: '書き続けるとコーチが下書きを確認します。', useful_phrases: '便利なフレーズ', review_wait: '入力を止めるとコーチが下書きを確認します。', store_price: 'ストア価格', save_ai: 'AI サービスを保存' },
  ko: { format_letter: '편지 또는 이메일', format_essay: '에세이', format_message: '짧은 메시지', audience_friend: '친구', audience_colleague: '동료', audience_teacher: '선생님', audience_customer: '고객', audience_general: '일반 독자', level_simple: '쉬움', level_natural: '자연스러움', level_advanced: '고급', completion_auto: '자동', completion_word: '단어', completion_phrase: '구', completion_sentence: '문장', tone_warm: '따뜻하고 친근하게', tone_professional: '전문적으로', tone_casual: '편안하게', tone_confident: '자신 있게', writing_flow: '글의 흐름', flow_start: '글쓰기 시작', flow_shape: '형태를 갖추는 중', flow_good: '좋음', flow_note_start: '조금 더 작성하면 피드백을 볼 수 있습니다.', flow_note_shape: '생각이 형태를 갖추고 있습니다. 계속 발전시켜 보세요.', flow_note_good: '명확하고 이해하기 쉬운 글입니다.', no_issues: '뚜렷한 문제 없음', no_issues_note: '현재 수준에 맞게 자연스럽게 읽힙니다.', no_issues_yet: '아직 문제 없음', no_issues_yet_note: '계속 작성하면 코치가 초안을 검토합니다.', useful_phrases: '유용한 표현', review_wait: '입력을 멈추면 코치가 초안을 검토합니다.', store_price: '스토어 가격', save_ai: 'AI 서비스 저장' },
  fr: { format_letter: 'Lettre ou e-mail', format_essay: 'Essai', format_message: 'Message court', audience_friend: 'Un ami', audience_colleague: 'Un collègue', audience_teacher: 'Un professeur', audience_customer: 'Un client', audience_general: 'Grand public', level_simple: 'Simple', level_natural: 'Naturel', level_advanced: 'Avancé', completion_auto: 'Auto', completion_word: 'Mot', completion_phrase: 'Expression', completion_sentence: 'Phrase', tone_warm: 'Chaleureux et amical', tone_professional: 'Professionnel', tone_casual: 'Décontracté', tone_confident: 'Assuré', writing_flow: 'Fluidité', flow_start: 'Commencez à écrire', flow_shape: 'Prend forme', flow_good: 'Bien', flow_note_start: 'Écrivez encore un peu pour obtenir des conseils.', flow_note_shape: 'Votre idée prend forme. Continuez à la développer.', flow_note_good: 'Le texte est clair et facile à suivre.', no_issues: 'Aucun problème évident', no_issues_note: 'Le brouillon est naturel pour le niveau actuel.', no_issues_yet: 'Aucun problème pour le moment', no_issues_yet_note: 'Continuez à écrire et le coach vérifiera le brouillon.', useful_phrases: 'Expressions utiles', review_wait: 'Faites une pause et le coach vérifiera le brouillon.', store_price: 'Prix du Store', save_ai: "Enregistrer le service d'IA" },
  de: { format_letter: 'Brief oder E-Mail', format_essay: 'Aufsatz', format_message: 'Kurze Nachricht', audience_friend: 'Ein Freund', audience_colleague: 'Ein Kollege', audience_teacher: 'Eine Lehrkraft', audience_customer: 'Ein Kunde', audience_general: 'Allgemeine Leserschaft', level_simple: 'Einfach', level_natural: 'Natürlich', level_advanced: 'Fortgeschritten', completion_auto: 'Auto', completion_word: 'Wort', completion_phrase: 'Ausdruck', completion_sentence: 'Satz', tone_warm: 'Warm und freundlich', tone_professional: 'Professionell', tone_casual: 'Locker', tone_confident: 'Selbstbewusst', writing_flow: 'Schreibfluss', flow_start: 'Schreiben beginnen', flow_shape: 'Nimmt Form an', flow_good: 'Gut', flow_note_start: 'Schreiben Sie etwas mehr, um Feedback zu erhalten.', flow_note_shape: 'Ihre Idee nimmt Form an. Entwickeln Sie sie weiter.', flow_note_good: 'Der Text ist klar und gut verständlich.', no_issues: 'Keine eindeutigen Probleme', no_issues_note: 'Der Entwurf liest sich für das aktuelle Niveau natürlich.', no_issues_yet: 'Noch keine Probleme', no_issues_yet_note: 'Schreiben Sie weiter; der Coach prüft den Entwurf.', useful_phrases: 'Nützliche Ausdrücke', review_wait: 'Nach einer Schreibpause prüft der Coach den Entwurf.', store_price: 'Store-Preis', save_ai: 'KI-Dienst speichern' },
  pt: { format_letter: 'Carta ou e-mail', format_essay: 'Redação', format_message: 'Mensagem curta', audience_friend: 'Um amigo', audience_colleague: 'Um colega', audience_teacher: 'Um professor', audience_customer: 'Um cliente', audience_general: 'Público geral', level_simple: 'Simples', level_natural: 'Natural', level_advanced: 'Avançado', completion_auto: 'Auto', completion_word: 'Palavra', completion_phrase: 'Expressão', completion_sentence: 'Frase', tone_warm: 'Caloroso e amigável', tone_professional: 'Profissional', tone_casual: 'Casual', tone_confident: 'Confiante', writing_flow: 'Fluidez', flow_start: 'Comece a escrever', flow_shape: 'Tomando forma', flow_good: 'Bom', flow_note_start: 'Escreva um pouco mais para ver comentários.', flow_note_shape: 'Sua ideia está tomando forma. Continue desenvolvendo.', flow_note_good: 'O texto está claro e fácil de acompanhar.', no_issues: 'Nenhum problema claro', no_issues_note: 'O rascunho está natural para o nível atual.', no_issues_yet: 'Nenhum problema ainda', no_issues_yet_note: 'Continue escrevendo e o assistente revisará o rascunho.', useful_phrases: 'Expressões úteis', review_wait: 'Faça uma pausa e o assistente revisará o rascunho.', store_price: 'Preço da loja', save_ai: 'Salvar serviço de IA' },
  ar: { format_letter: 'رسالة أو بريد إلكتروني', format_essay: 'مقال', format_message: 'رسالة قصيرة', audience_friend: 'صديق', audience_colleague: 'زميل', audience_teacher: 'معلّم', audience_customer: 'عميل', audience_general: 'قارئ عام', level_simple: 'بسيط', level_natural: 'طبيعي', level_advanced: 'متقدم', completion_auto: 'تلقائي', completion_word: 'كلمة', completion_phrase: 'عبارة', completion_sentence: 'جملة', tone_warm: 'ودود ودافئ', tone_professional: 'مهني', tone_casual: 'غير رسمي', tone_confident: 'واثق', writing_flow: 'تدفق الكتابة', flow_start: 'ابدأ الكتابة', flow_shape: 'بدأ يتشكل', flow_good: 'جيد', flow_note_start: 'اكتب المزيد قليلًا لعرض الملاحظات.', flow_note_shape: 'بدأت فكرتك تتشكل. واصل تطويرها.', flow_note_good: 'النص واضح وسهل المتابعة.', no_issues: 'لا توجد مشكلات واضحة', no_issues_note: 'تبدو المسودة طبيعية للمستوى الحالي.', no_issues_yet: 'لا توجد مشكلات بعد', no_issues_yet_note: 'واصل الكتابة وسيراجع المدرب المسودة.', useful_phrases: 'عبارات مفيدة', review_wait: 'توقف قليلًا ليقوم المدرب بمراجعة المسودة.', store_price: 'سعر المتجر', save_ai: 'حفظ خدمة الذكاء الاصطناعي' },
  hi: { format_letter: 'पत्र या ईमेल', format_essay: 'निबंध', format_message: 'छोटा संदेश', audience_friend: 'एक मित्र', audience_colleague: 'एक सहकर्मी', audience_teacher: 'एक शिक्षक', audience_customer: 'एक ग्राहक', audience_general: 'सामान्य पाठक', level_simple: 'सरल', level_natural: 'स्वाभाविक', level_advanced: 'उन्नत', completion_auto: 'स्वतः', completion_word: 'शब्द', completion_phrase: 'वाक्यांश', completion_sentence: 'वाक्य', tone_warm: 'स्नेहपूर्ण और मैत्रीपूर्ण', tone_professional: 'पेशेवर', tone_casual: 'अनौपचारिक', tone_confident: 'आत्मविश्वासी', writing_flow: 'लेखन प्रवाह', flow_start: 'लिखना शुरू करें', flow_shape: 'आकार ले रहा है', flow_good: 'अच्छा', flow_note_start: 'प्रतिक्रिया देखने के लिए थोड़ा और लिखें।', flow_note_shape: 'आपका विचार आकार ले रहा है। इसे आगे बढ़ाएँ।', flow_note_good: 'लेखन स्पष्ट और समझने में आसान है।', no_issues: 'कोई स्पष्ट समस्या नहीं', no_issues_note: 'मौजूदा स्तर के लिए ड्राफ़्ट स्वाभाविक है।', no_issues_yet: 'अभी कोई समस्या नहीं', no_issues_yet_note: 'लिखते रहें और सहायक ड्राफ़्ट की समीक्षा करेगा।', useful_phrases: 'उपयोगी वाक्यांश', review_wait: 'कुछ देर रुकें और सहायक ड्राफ़्ट की समीक्षा करेगा।', store_price: 'स्टोर मूल्य', save_ai: 'AI सेवा सेव करें' },
  ru: { format_letter: 'Письмо или эл. почта', format_essay: 'Эссе', format_message: 'Короткое сообщение', audience_friend: 'Друг', audience_colleague: 'Коллега', audience_teacher: 'Преподаватель', audience_customer: 'Клиент', audience_general: 'Широкая аудитория', level_simple: 'Простой', level_natural: 'Естественный', level_advanced: 'Продвинутый', completion_auto: 'Авто', completion_word: 'Слово', completion_phrase: 'Фраза', completion_sentence: 'Предложение', tone_warm: 'Тёплый и дружелюбный', tone_professional: 'Профессиональный', tone_casual: 'Неформальный', tone_confident: 'Уверенный', writing_flow: 'Связность текста', flow_start: 'Начните писать', flow_shape: 'Приобретает форму', flow_good: 'Хорошо', flow_note_start: 'Напишите ещё немного, чтобы увидеть подсказки.', flow_note_shape: 'Ваша мысль приобретает форму. Продолжайте развивать её.', flow_note_good: 'Текст понятен и легко читается.', no_issues: 'Явных проблем нет', no_issues_note: 'Черновик звучит естественно для текущего уровня.', no_issues_yet: 'Проблем пока нет', no_issues_yet_note: 'Продолжайте писать, и помощник проверит черновик.', useful_phrases: 'Полезные фразы', review_wait: 'Остановитесь ненадолго, и помощник проверит черновик.', store_price: 'Цена в Store', save_ai: 'Сохранить сервис ИИ' }
};

const NAV_I18N = {
  en: { write: 'Write', plans_nav: 'Plans', account_nav: 'Account', tickets_nav: 'Tickets', completion_off: 'Off' },
  zh: { write: '写作', plans_nav: '套餐', account_nav: '账户', tickets_nav: '工单', completion_off: '关闭' },
};

const HELP_I18N = {
  en: { api_key_help: 'Your API key stays on this computer and is protected by Windows encryption. It is never uploaded to WriteMelo servers.' },
  zh: { api_key_help: 'API Key 仅保存在这台电脑上，并由 Windows 加密保护；不会上传到 WriteMelo 服务器。' },
  es: { api_key_help: 'Tu clave API permanece en este equipo y está protegida por el cifrado de Windows. Nunca se carga en los servidores de WriteMelo.' },
  ja: { api_key_help: 'API キーはこの PC にのみ保存され、Windows の暗号化で保護されます。WriteMelo のサーバーには送信されません。' },
  ko: { api_key_help: 'API 키는 이 컴퓨터에만 저장되며 Windows 암호화로 보호됩니다. WriteMelo 서버로 업로드되지 않습니다.' },
  fr: { api_key_help: "Votre clé API reste sur cet ordinateur et est protégée par le chiffrement Windows. Elle n'est jamais envoyée aux serveurs WriteMelo." },
  de: { api_key_help: 'Ihr API-Schlüssel bleibt auf diesem Computer und wird durch die Windows-Verschlüsselung geschützt. Er wird nie auf WriteMelo-Server hochgeladen.' },
  pt: { api_key_help: 'Sua chave de API fica neste computador e é protegida pela criptografia do Windows. Ela nunca é enviada aos servidores do WriteMelo.' },
  ar: { api_key_help: 'يبقى مفتاح API على هذا الكمبيوتر وتحميه آلية تشفير Windows. ولا يُرفع إلى خوادم WriteMelo.' },
  hi: { api_key_help: 'आपकी API key इसी कंप्यूटर पर रहती है और Windows एन्क्रिप्शन से सुरक्षित होती है। इसे WriteMelo सर्वर पर अपलोड नहीं किया जाता।' },
  ru: { api_key_help: 'Ключ API хранится только на этом компьютере и защищён шифрованием Windows. Он не отправляется на серверы WriteMelo.' }
};

const REVIEW_I18N = {
  en: { polish_subject: 'Polish subject', polish_text: 'Polish text', explain: 'Explain', simplify: 'Simplify', reviewing: 'Reviewing context and wording...', improvements_found: '{count} possible improvements found.', one_improvement_found: '1 possible improvement found.', no_problems_found: 'No clear problems found.', intent_label: 'Writing intent', apply: 'Apply', grammar: 'Grammar', clarity: 'Clarity', wording: 'Wording', repetition: 'Repetition', tone_category: 'Tone', suggestion_applied: 'Suggestion applied' },
  zh: { polish_subject: '润色主题', polish_text: '润色正文', explain: '解释', simplify: '简化', reviewing: '正在检查语境和表达……', improvements_found: '发现 {count} 处可改进内容。', one_improvement_found: '发现 1 处可改进内容。', no_problems_found: '未发现明显问题。', intent_label: '写作意图', apply: '修改', grammar: '语法', clarity: '清晰度', wording: '用词', repetition: '重复', tone_category: '语气', suggestion_applied: '已应用修改' },
  es: { polish_subject: 'Mejorar asunto', polish_text: 'Mejorar texto', explain: 'Explicar', simplify: 'Simplificar', reviewing: 'Revisando contexto y redacción...', improvements_found: 'Se encontraron {count} posibles mejoras.', one_improvement_found: 'Se encontró 1 posible mejora.', no_problems_found: 'No se encontraron problemas claros.', intent_label: 'Intención', apply: 'Aplicar', grammar: 'Gramática', clarity: 'Claridad', wording: 'Redacción', repetition: 'Repetición', tone_category: 'Tono', suggestion_applied: 'Cambio aplicado' },
  ja: { polish_subject: '件名を改善', polish_text: '本文を改善', explain: '解説', simplify: '簡単にする', reviewing: '文脈と表現を確認中...', improvements_found: '{count} 件の改善候補があります。', one_improvement_found: '1 件の改善候補があります。', no_problems_found: '明確な問題はありません。', intent_label: '文章の意図', apply: '適用', grammar: '文法', clarity: '明確さ', wording: '表現', repetition: '繰り返し', tone_category: 'トーン', suggestion_applied: '修正を適用しました' },
  ko: { polish_subject: '제목 다듬기', polish_text: '본문 다듬기', explain: '설명', simplify: '쉽게 쓰기', reviewing: '문맥과 표현을 검토하는 중...', improvements_found: '개선 가능한 부분 {count}개를 찾았습니다.', one_improvement_found: '개선 가능한 부분 1개를 찾았습니다.', no_problems_found: '뚜렷한 문제를 찾지 못했습니다.', intent_label: '글쓰기 의도', apply: '적용', grammar: '문법', clarity: '명확성', wording: '표현', repetition: '반복', tone_category: '어조', suggestion_applied: '수정을 적용했습니다' },
  fr: { polish_subject: "Améliorer l'objet", polish_text: 'Améliorer le texte', explain: 'Expliquer', simplify: 'Simplifier', reviewing: 'Analyse du contexte et de la formulation...', improvements_found: '{count} améliorations possibles trouvées.', one_improvement_found: '1 amélioration possible trouvée.', no_problems_found: 'Aucun problème évident trouvé.', intent_label: "Intention d'écriture", apply: 'Appliquer', grammar: 'Grammaire', clarity: 'Clarté', wording: 'Formulation', repetition: 'Répétition', tone_category: 'Ton', suggestion_applied: 'Modification appliquée' },
  de: { polish_subject: 'Betreff verbessern', polish_text: 'Text verbessern', explain: 'Erklären', simplify: 'Vereinfachen', reviewing: 'Kontext und Formulierung werden geprüft...', improvements_found: '{count} mögliche Verbesserungen gefunden.', one_improvement_found: '1 mögliche Verbesserung gefunden.', no_problems_found: 'Keine eindeutigen Probleme gefunden.', intent_label: 'Schreibabsicht', apply: 'Übernehmen', grammar: 'Grammatik', clarity: 'Klarheit', wording: 'Formulierung', repetition: 'Wiederholung', tone_category: 'Ton', suggestion_applied: 'Änderung übernommen' },
  pt: { polish_subject: 'Aprimorar assunto', polish_text: 'Aprimorar texto', explain: 'Explicar', simplify: 'Simplificar', reviewing: 'Revisando contexto e redação...', improvements_found: '{count} melhorias possíveis encontradas.', one_improvement_found: '1 melhoria possível encontrada.', no_problems_found: 'Nenhum problema claro encontrado.', intent_label: 'Intenção da escrita', apply: 'Aplicar', grammar: 'Gramática', clarity: 'Clareza', wording: 'Redação', repetition: 'Repetição', tone_category: 'Tom', suggestion_applied: 'Alteração aplicada' },
  ar: { polish_subject: 'تحسين الموضوع', polish_text: 'تحسين النص', explain: 'شرح', simplify: 'تبسيط', reviewing: 'تتم مراجعة السياق والصياغة...', improvements_found: 'تم العثور على {count} تحسينات محتملة.', one_improvement_found: 'تم العثور على تحسين محتمل واحد.', no_problems_found: 'لم يتم العثور على مشكلات واضحة.', intent_label: 'هدف الكتابة', apply: 'تطبيق', grammar: 'القواعد', clarity: 'الوضوح', wording: 'الصياغة', repetition: 'التكرار', tone_category: 'النبرة', suggestion_applied: 'تم تطبيق التعديل' },
  hi: { polish_subject: 'विषय सुधारें', polish_text: 'पाठ सुधारें', explain: 'समझाएँ', simplify: 'सरल करें', reviewing: 'संदर्भ और भाषा की समीक्षा हो रही है...', improvements_found: '{count} संभावित सुधार मिले।', one_improvement_found: '1 संभावित सुधार मिला।', no_problems_found: 'कोई स्पष्ट समस्या नहीं मिली।', intent_label: 'लेखन का उद्देश्य', apply: 'लागू करें', grammar: 'व्याकरण', clarity: 'स्पष्टता', wording: 'शब्दावली', repetition: 'दोहराव', tone_category: 'लहजा', suggestion_applied: 'सुधार लागू किया गया' },
  ru: { polish_subject: 'Улучшить тему', polish_text: 'Улучшить текст', explain: 'Объяснить', simplify: 'Упростить', reviewing: 'Проверяем контекст и формулировки...', improvements_found: 'Найдено возможных улучшений: {count}.', one_improvement_found: 'Найдено 1 возможное улучшение.', no_problems_found: 'Явных проблем не найдено.', intent_label: 'Цель текста', apply: 'Применить', grammar: 'Грамматика', clarity: 'Ясность', wording: 'Формулировка', repetition: 'Повтор', tone_category: 'Тон', suggestion_applied: 'Изменение применено' }
};

const WORKSPACE_I18N = {
  en: { saved: 'Saved', saving: 'Saving...', share: 'Share', draft_letter: 'DRAFT LETTER', draft_essay: 'DRAFT ESSAY', draft_message: 'DRAFT MESSAGE', to: 'To', subject: 'Subject', select_sentence: 'Select text or place the cursor in a sentence', suggestion: 'Suggestion', tab_to_accept: 'Tab to accept', words: 'words', tab_accept: 'accept', esc_dismiss: 'dismiss', finish_letter: 'Finish letter', finish_essay: 'Finish essay', finish_message: 'Finish message', model_connected: 'Custom model service connected', configure_model: 'Configure AI service' },
  zh: { saved: '已保存', saving: '正在保存……', share: '分享', draft_letter: '信件草稿', draft_essay: '文章草稿', draft_message: '消息草稿', to: '收件人', subject: '主题', select_sentence: '选择文字，或将光标放在一个句子中', suggestion: '建议', tab_to_accept: '按 Tab 接受', words: '词', tab_accept: '接受', esc_dismiss: '忽略', finish_letter: '完成信件', finish_essay: '完成文章', finish_message: '完成消息', model_connected: '已连接自定义模型服务', configure_model: '配置 AI 服务' },
  es: { saved: 'Guardado', saving: 'Guardando...', share: 'Compartir', draft_letter: 'BORRADOR DE CARTA', draft_essay: 'BORRADOR DE ENSAYO', draft_message: 'BORRADOR DE MENSAJE', to: 'Para', subject: 'Asunto', select_sentence: 'Selecciona texto o coloca el cursor en una oración', suggestion: 'Sugerencia', tab_to_accept: 'Tab para aceptar', words: 'palabras', tab_accept: 'aceptar', esc_dismiss: 'descartar', finish_letter: 'Terminar carta', finish_essay: 'Terminar ensayo', finish_message: 'Terminar mensaje', model_connected: 'Servicio de modelo personalizado conectado', configure_model: 'Configurar servicio de IA' },
  ja: { saved: '保存済み', saving: '保存中...', share: '共有', draft_letter: '手紙の下書き', draft_essay: '作文の下書き', draft_message: 'メッセージの下書き', to: '宛先', subject: '件名', select_sentence: 'テキストを選択するか、文中にカーソルを置いてください', suggestion: '提案', tab_to_accept: 'Tab で適用', words: '語', tab_accept: '適用', esc_dismiss: '閉じる', finish_letter: '手紙を完成', finish_essay: '作文を完成', finish_message: 'メッセージを完成', model_connected: 'カスタムモデルサービスに接続済み', configure_model: 'AI サービスを設定' },
  ko: { saved: '저장됨', saving: '저장 중...', share: '공유', draft_letter: '편지 초안', draft_essay: '에세이 초안', draft_message: '메시지 초안', to: '받는 사람', subject: '제목', select_sentence: '텍스트를 선택하거나 문장에 커서를 놓으세요', suggestion: '제안', tab_to_accept: 'Tab으로 적용', words: '단어', tab_accept: '적용', esc_dismiss: '닫기', finish_letter: '편지 완료', finish_essay: '에세이 완료', finish_message: '메시지 완료', model_connected: '사용자 지정 모델 서비스 연결됨', configure_model: 'AI 서비스 설정' },
  fr: { saved: 'Enregistré', saving: 'Enregistrement...', share: 'Partager', draft_letter: 'BROUILLON DE LETTRE', draft_essay: "BROUILLON D'ESSAI", draft_message: 'BROUILLON DE MESSAGE', to: 'À', subject: 'Objet', select_sentence: 'Sélectionnez du texte ou placez le curseur dans une phrase', suggestion: 'Suggestion', tab_to_accept: 'Tab pour accepter', words: 'mots', tab_accept: 'accepter', esc_dismiss: 'ignorer', finish_letter: 'Terminer la lettre', finish_essay: "Terminer l'essai", finish_message: 'Terminer le message', model_connected: 'Service de modèle personnalisé connecté', configure_model: "Configurer le service d'IA" },
  de: { saved: 'Gespeichert', saving: 'Wird gespeichert...', share: 'Teilen', draft_letter: 'BRIEFENTWURF', draft_essay: 'AUFSATZENTWURF', draft_message: 'NACHRICHTENTWURF', to: 'An', subject: 'Betreff', select_sentence: 'Text auswählen oder den Cursor in einen Satz setzen', suggestion: 'Vorschlag', tab_to_accept: 'Mit Tab übernehmen', words: 'Wörter', tab_accept: 'übernehmen', esc_dismiss: 'verwerfen', finish_letter: 'Brief abschließen', finish_essay: 'Aufsatz abschließen', finish_message: 'Nachricht abschließen', model_connected: 'Eigener Modelldienst verbunden', configure_model: 'KI-Dienst einrichten' },
  pt: { saved: 'Salvo', saving: 'Salvando...', share: 'Compartilhar', draft_letter: 'RASCUNHO DE CARTA', draft_essay: 'RASCUNHO DE REDAÇÃO', draft_message: 'RASCUNHO DE MENSAGEM', to: 'Para', subject: 'Assunto', select_sentence: 'Selecione o texto ou coloque o cursor em uma frase', suggestion: 'Sugestão', tab_to_accept: 'Tab para aceitar', words: 'palavras', tab_accept: 'aceitar', esc_dismiss: 'descartar', finish_letter: 'Concluir carta', finish_essay: 'Concluir redação', finish_message: 'Concluir mensagem', model_connected: 'Serviço de modelo personalizado conectado', configure_model: 'Configurar serviço de IA' },
  ar: { saved: 'تم الحفظ', saving: 'جارٍ الحفظ...', share: 'مشاركة', draft_letter: 'مسودة رسالة', draft_essay: 'مسودة مقال', draft_message: 'مسودة رسالة قصيرة', to: 'إلى', subject: 'الموضوع', select_sentence: 'حدد نصًا أو ضع المؤشر داخل جملة', suggestion: 'اقتراح', tab_to_accept: 'اضغط Tab للقبول', words: 'كلمات', tab_accept: 'قبول', esc_dismiss: 'تجاهل', finish_letter: 'إنهاء الرسالة', finish_essay: 'إنهاء المقال', finish_message: 'إنهاء الرسالة القصيرة', model_connected: 'تم الاتصال بخدمة النموذج المخصصة', configure_model: 'إعداد خدمة الذكاء الاصطناعي' },
  hi: { saved: 'सहेजा गया', saving: 'सहेजा जा रहा है...', share: 'साझा करें', draft_letter: 'पत्र का ड्राफ़्ट', draft_essay: 'निबंध का ड्राफ़्ट', draft_message: 'संदेश का ड्राफ़्ट', to: 'प्रति', subject: 'विषय', select_sentence: 'टेक्स्ट चुनें या कर्सर किसी वाक्य में रखें', suggestion: 'सुझाव', tab_to_accept: 'स्वीकार करने के लिए Tab', words: 'शब्द', tab_accept: 'स्वीकार', esc_dismiss: 'हटाएँ', finish_letter: 'पत्र पूरा करें', finish_essay: 'निबंध पूरा करें', finish_message: 'संदेश पूरा करें', model_connected: 'कस्टम मॉडल सेवा कनेक्ट है', configure_model: 'AI सेवा सेट करें' },
  ru: { saved: 'Сохранено', saving: 'Сохранение...', share: 'Поделиться', draft_letter: 'ЧЕРНОВИК ПИСЬМА', draft_essay: 'ЧЕРНОВИК ЭССЕ', draft_message: 'ЧЕРНОВИК СООБЩЕНИЯ', to: 'Кому', subject: 'Тема', select_sentence: 'Выделите текст или установите курсор в предложение', suggestion: 'Вариант', tab_to_accept: 'Tab — принять', words: 'слов', tab_accept: 'принять', esc_dismiss: 'отклонить', finish_letter: 'Завершить письмо', finish_essay: 'Завершить эссе', finish_message: 'Завершить сообщение', model_connected: 'Собственный сервис модели подключён', configure_model: 'Настроить сервис ИИ' }
};

let activeUiLanguage = 'en';

function resolvedUiLanguage(value = 'auto') {
  const requested = !value || value === 'auto' ? (navigator.language || 'en') : value;
  const language = requested.toLowerCase().split('-')[0];
  return language === 'zh' ? 'zh' : 'en';
}

function applyUiLanguage(value) {
  const language = resolvedUiLanguage(value);
  activeUiLanguage = language;
  const messages = { ...SETTINGS_I18N[language], ...APP_I18N[language], ...COMMERCE_I18N[language], ...DETAIL_I18N[language], ...HELP_I18N[language], ...REVIEW_I18N[language], ...WORKSPACE_I18N[language], ...NAV_I18N[language] };
  const fallback = { ...SETTINGS_I18N.en, ...APP_I18N.en, ...COMMERCE_I18N.en, ...DETAIL_I18N.en, ...HELP_I18N.en, ...REVIEW_I18N.en, ...WORKSPACE_I18N.en, ...NAV_I18N.en };
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  $('#copyDocumentButton').textContent = language === 'zh' ? '复制全文' : 'Copy text';
  $('#accessGuideButton').textContent = language === 'zh' ? 'AI 服务' : 'AI service';
  if (language === 'zh') {
    $('#accessNoticeTitle').textContent = '选择 AI 功能的使用方式';
    $('#trialAccessTitle').textContent = '免费基础试用';
    $('#trialAccessText').textContent = '无需 API Key。受个人额度和全站免费资源池限制，用完后不会自动扣费。';
    $('#byokAccessTitle').textContent = '换用更好的模型';
    $('#byokAccessText').textContent = '需要更好的长文衔接、语气和复杂改写时，可在 Windows 客户端自备 API Key。';
    $('#trialAccessLink').textContent = '登录试用';
    $('#byokGuideLink').textContent = '比较模型';
    $('#accessPrivacyTitle').textContent = '免费试用用于判断流程是否适合你，模型质量仍会影响结果';
    $('#accessPrivacyText').textContent = '更强模型通常更擅长长上下文、细微语气和复杂修改，但价格不等于绝对质量。自备 Key 仍只保存在 Windows 本机。';
  } else {
    $('#accessNoticeTitle').textContent = 'Choose how to use AI features';
    $('#trialAccessTitle').textContent = 'Free basic trial';
    $('#trialAccessText').textContent = 'No API key required. Personal and shared free limits apply; there is no automatic charge.';
    $('#byokAccessTitle').textContent = 'Use a better model';
    $('#byokAccessText').textContent = 'Bring your own API Key in the Windows app for stronger long-context, tone and revision quality.';
    $('#trialAccessLink').textContent = 'Sign in';
    $('#byokGuideLink').textContent = 'Compare models';
    $('#accessPrivacyTitle').textContent = 'The free trial tests the workflow; model quality still affects the result.';
    $('#accessPrivacyText').textContent = 'Stronger models usually handle long context, nuance and complex revisions better, but price does not guarantee quality. Your own Key stays in the Windows app.';
  }
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const message = messages[element.dataset.i18n] || fallback[element.dataset.i18n];
    if (message) element.textContent = message;
  });
  if ($('#format')) setFormat($('#format').value, false);
  if ($('#connectionState') && modelConfigured) {
    $('#connectionState').innerHTML = `<i></i> ${translated('model_connected')}`;
  }
  updateStats();
  renderReview();
}

function translated(key) {
  const language = activeUiLanguage;
  return WORKSPACE_I18N[language]?.[key] || REVIEW_I18N[language]?.[key] || DETAIL_I18N[language]?.[key] || COMMERCE_I18N[language]?.[key] || SETTINGS_I18N[language]?.[key] || WORKSPACE_I18N.en[key] || REVIEW_I18N.en[key] || DETAIL_I18N.en[key] || COMMERCE_I18N.en[key] || SETTINGS_I18N.en[key] || key;
}

function scopedKey(name) {
  return `enwrite:user:${storageScope}:${name}`;
}

function storageGet(name) {
  return localStorage.getItem(scopedKey(name));
}

function storageSet(name, value) {
  localStorage.setItem(scopedKey(name), value);
}

function clearLegacyStorage() {
  if (localStorage.getItem(STORAGE_MIGRATION_KEY) === 'done') return;
  LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  localStorage.setItem(STORAGE_MIGRATION_KEY, 'done');
}

const content = {
  letter: {
    eyebrow: 'DRAFT LETTER', title: 'A letter to an old friend', finish: 'Finish letter',
    text: 'Hi Emma,\n\nIt was so lovely to receive your last letter. I was happy to hear about your new apartment and the little garden you have started.\n\nLife here has been busy, but in a good way. Last weekend, I',
    phrases: ['I have been meaning to tell you about ', 'That reminded me of the time when ', 'I would love to hear more about ']
  },
  essay: {
    eyebrow: 'DRAFT ESSAY', title: 'The value of learning a language', finish: 'Finish essay',
    text: 'Learning a new language is about more than remembering words. It gives us a new way to understand people and the world around us. One important reason is',
    phrases: ['One clear example of this is ', 'Another point worth considering is ', 'In conclusion, I believe that ']
  },
  message: {
    eyebrow: 'DRAFT MESSAGE', title: 'Catch up with a friend', finish: 'Finish message',
    text: "Hey! It has been a while. I was just thinking about",
    phrases: ['Are you free sometime this week? ', 'It would be great to catch up. ', 'Let me know what works for you. ']
  }
};

let currentLevel = 'natural';
let completionMode = 'auto';
let activeSuggestion = '';
let activeKind = '';
let dismissedValue = '';
let saveTimer;
let completionTimer;
let completionRequest;
let phraseOffset = 0;
let modelConfigured = false;
let assistRange = null;
const chatHistory = [];
const completionCache = new Map();
let reviewIssues = [];
let currentIntent = '';
let reviewTimer;
let reviewRequest;
let desktopApp = false;
let currentFileName = '';
let fileDirty = false;

function words() {
  const matches = editor.value.trim().match(/\b[\w'-]+\b/g);
  return matches ? matches.length : 0;
}

function localWordSuggestion(value) {
  return EnWriteCompletion.getWordSuggestion(value, currentLevel);
}

function showSuggestion(suggestion, kind) {
  suggestion = EnWriteCompletion.normalizeSuggestionBoundary(editor.value, suggestion, kind);
  activeSuggestion = suggestion;
  activeKind = kind;
  renderMirror();
  ghostText.textContent = suggestion;
  $('#suggestionKind').textContent = translated(`completion_${kind}`);
  autocompleteStatus.classList.toggle('hidden', !suggestion);
  suggestionBar.classList.toggle('hidden', !suggestion);
  $('#barKind').textContent = kind ? translated(`completion_${kind}`) : translated('suggestion');
  $('#barText').textContent = suggestion;
  modelThinking.classList.add('hidden');
}

function clearSuggestion() {
  showSuggestion('', '');
}

function remoteMode(value) {
  if (completionMode === 'off') return '';
  if (completionMode !== 'auto') return completionMode;
  if (/([A-Za-z][A-Za-z'-]{2,})$/.test(value)) return 'word';
  return /[.!?][\s\n]*$/.test(value) ? 'sentence' : 'phrase';
}

function scheduleCompletion() {
  clearTimeout(completionTimer);
  if (completionRequest) {
    completionRequest.abort();
    completionRequest = null;
  }
  if (completionMode === 'off') return clearSuggestion();
  const value = editor.value;
  const atEnd = editor.selectionStart === value.length && editor.selectionEnd === value.length;
  if (!atEnd || value === dismissedValue || !value.trim()) return clearSuggestion();

  if (completionMode === 'auto' || completionMode === 'word') {
    const wordSuggestion = localWordSuggestion(value);
    if (wordSuggestion) return showSuggestion(wordSuggestion, 'word');
  }

  const mode = remoteMode(value);
  const quickSuggestion = mode !== 'word' ? EnWriteCompletion.getContextSuggestion(value) : '';
  if (quickSuggestion) showSuggestion(quickSuggestion, mode);
  else clearSuggestion();
  if (!mode || !modelConfigured) return;
  const delay = mode === 'word' ? 180 : mode === 'phrase' ? 280 : 320;
  completionTimer = setTimeout(() => requestCompletion(value, mode), delay);
}

async function requestCompletion(value, mode) {
  const cacheKey = JSON.stringify([value.slice(-1200), mode, currentLevel, $('#format').value, $('#relationship').value, $('#tone').value]);
  if (completionCache.has(cacheKey)) return showSuggestion(completionCache.get(cacheKey), mode);
  completionRequest = new AbortController();
  modelThinking.classList.remove('hidden');
  try {
    const streaming = mode !== 'word';
    const response = await fetch(streaming ? '/api/complete-stream' : '/api/complete', {
      method: 'POST',
      headers: modelRequestHeaders(),
      signal: completionRequest.signal,
      body: JSON.stringify({
        text: value,
        mode,
        level: currentLevel,
        language: $('#explanationLanguage').value,
        format: $('#format').value,
        audience: $('#relationship').value,
        tone: $('#tone').value,
        intent: currentIntent
      })
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Completion request failed');
    }
    if (streaming) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let suggestion = '';
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        suggestion += decoder.decode(chunk, { stream: true });
        const unchanged = editor.value === value && editor.selectionStart === value.length;
        if (unchanged && suggestion) showSuggestion(suggestion, mode);
      }
      if (suggestion) {
        completionCache.set(cacheKey, suggestion);
        if (completionCache.size > 80) completionCache.delete(completionCache.keys().next().value);
      }
      return;
    }
    const data = await response.json();
    $('#connectionState').className = 'connection-state online';
    $('#connectionState').innerHTML = `<i></i> ${translated('model_connected')}`;
    const unchanged = editor.value === value && editor.selectionStart === value.length;
    if (data.suggestion) {
      completionCache.set(cacheKey, data.suggestion);
      if (completionCache.size > 80) completionCache.delete(completionCache.keys().next().value);
    }
    if (unchanged && data.suggestion) showSuggestion(data.suggestion, data.kind || mode);
  } catch (error) {
    if (error.name !== 'AbortError') {
      modelThinking.classList.add('hidden');
      $('#connectionState').className = 'connection-state offline';
      $('#connectionState').innerHTML = '<i></i> Model unavailable';
    }
  }
}

async function checkModel() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const data = await response.json();
    desktopApp = Boolean(data.desktop);
    $('#settingsButton').classList.toggle('hidden', !desktopApp);
    const localAccountUrl = ['127.0.0.1', 'localhost'].includes(location.hostname)
      ? `${location.protocol}//${location.hostname}:8787/support.html`
      : 'support.html';
    const portalUrl = data.account_portal_url || localAccountUrl;
    $('#accountPortalLink').href = portalUrl;
    $('#plansPortalLink').href = portalUrl.replace(/support\.html(?:$|[?#])/, 'plans.html');
    $('#ticketsPortalLink').href = portalUrl.replace(/support\.html(?:$|[?#])/, 'tickets.html');
    $('#trialAccessLink').href = portalUrl;
    const needsTrialSignIn = Boolean(data.requires_account && !sessionStorage.getItem('writemelo-access-token'));
    modelConfigured = Boolean(data.configured) && !needsTrialSignIn;
    storageScope = data.storage_scope || 'local';
    $('#connectionState').className = `connection-state ${modelConfigured ? 'online' : 'offline'}`;
    $('#connectionState').innerHTML = `<i></i> ${needsTrialSignIn
      ? (activeUiLanguage === 'zh' ? '登录后试用' : 'Sign in to try')
      : translated(modelConfigured ? 'model_connected' : 'configure_model')}`;
    if (modelConfigured) { scheduleCompletion(); scheduleReview(); }
    else if (desktopApp && !sessionStorage.getItem(scopedKey('settings-dismissed'))) openModelSettings();
    return data;
  } catch {
    modelConfigured = false;
    $('#connectionState').className = 'connection-state offline';
    $('#connectionState').innerHTML = '<i></i> Start server for AI';
    return null;
  }
}

function modelConfigPayload() {
  return {
    provider_mode: 'byok',
    base_url: $('#modelBaseUrl').value.trim(),
    api_key: $('#modelApiKey').value.trim(),
    model: $('#modelName').value.trim(),
    autocomplete_model: $('#modelName').value.trim(),
    api_style: $('#modelApiStyle').value
  };
}

function setSettingsStatus(message, kind = '') {
  const status = $('#settingsStatus');
  status.textContent = message;
  status.className = `settings-status ${kind}`;
}

function updateProviderMode() {
  $('#byokProviderFields').classList.remove('hidden');
  $('#modelBaseUrl').required = true;
  $('#modelName').required = true;
}

async function loadModelSettings() {
  const response = await fetch('/api/config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load model settings');
  const data = await response.json();
  $('#modelBaseUrl').value = data.saved_base_url || '';
  $('#modelName').value = data.saved_model || '';
  $('#modelApiStyle').value = data.api_style || 'chat';
  $('#modelApiKey').value = '';
  $('#modelApiKey').placeholder = data.api_key_set ? 'Saved API key' : 'example-api-key';
  updateProviderMode();
  setSettingsStatus('');
}

async function openModelSettings() {
  $('#settingsModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  try { await loadModelSettings(); }
  catch (error) { setSettingsStatus(error.message, 'error'); }
  $('#closeSettings').focus();
}

function closeModelSettings() {
  $('#settingsModal').classList.add('hidden');
  sessionStorage.setItem(scopedKey('settings-dismissed'), '1');
  document.body.classList.remove('modal-open');
}

async function submitModelConfig(path) {
  const isTest = path.endsWith('/test');
  const button = isTest ? $('#testModelConnection') : $('#settingsForm button[type="submit"]');
  button.disabled = true;
  setSettingsStatus(isTest ? 'Testing connection...' : 'Saving settings...');
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelConfigPayload())
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    setSettingsStatus(isTest ? data.message : 'Settings saved.', 'success');
    if (!isTest) {
      modelConfigured = Boolean(data.configured);
      completionCache.clear();
      const previousScope = storageScope;
      await checkModel();
      if (storageScope !== previousScope) loadScopedWorkspace();
      setTimeout(closeModelSettings, 500);
    }
  } catch (error) {
    setSettingsStatus(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function updateStats() {
  const count = words();
  wordCount.textContent = count;
  const score = Math.min(94, 55 + count);
  $('#flowBar').style.width = `${score}%`;
  $('#flowLabel').textContent = translated(count < 8 ? 'flow_start' : count < 25 ? 'flow_shape' : 'flow_good');
  $('#flowNote').textContent = translated(count < 8 ? 'flow_note_start' : count < 25 ? 'flow_note_shape' : 'flow_note_good');
}

function renderMirror() {
  mirrorText.textContent = '';
  if (!reviewIssues.length) {
    mirrorText.textContent = editor.value;
    return;
  }
  let cursor = 0;
  reviewIssues.forEach((issue, index) => {
    mirrorText.appendChild(document.createTextNode(editor.value.slice(cursor, issue.start)));
    const mark = document.createElement('span');
    mark.className = `review-mark ${issue.severity === 'warning' ? 'warning' : 'suggestion'}`;
    mark.dataset.issueIndex = index;
    mark.textContent = editor.value.slice(issue.start, issue.end);
    mirrorText.appendChild(mark);
    cursor = issue.end;
  });
  mirrorText.appendChild(document.createTextNode(editor.value.slice(cursor)));
}

function scheduleReview() {
  clearTimeout(reviewTimer);
  if (!modelConfigured || words() < 4) return;
  reviewTimer = setTimeout(() => reviewDraft(false), 1600);
}

async function reviewDraft(manual = true) {
  clearTimeout(reviewTimer);
  if (reviewRequest) reviewRequest.abort();
  if (!editor.value.trim()) return;
  reviewRequest = new AbortController();
  $('#reviewDraft').disabled = true;
  $('#reviewStatus').textContent = translated('reviewing');
  try {
    const response = await fetch('/api/review', {
      method: 'POST', headers: modelRequestHeaders(), signal: reviewRequest.signal,
      body: JSON.stringify({ text: editor.value, level: currentLevel, language: $('#explanationLanguage').value, format: $('#format').value, audience: $('#relationship').value, tone: $('#tone').value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Review failed');
    currentIntent = data.intent || '';
    reviewIssues = EnWriteCompletion.findIssueRanges(editor.value, data.issues || []);
    renderMirror(); renderReview();
    $('#reviewStatus').textContent = reviewIssues.length
      ? translated(reviewIssues.length === 1 ? 'one_improvement_found' : 'improvements_found').replace('{count}', reviewIssues.length)
      : translated('no_problems_found');
    if (manual && !reviewIssues.length) notify('No clear writing problems found');
  } catch (error) {
    if (error.name !== 'AbortError') $('#reviewStatus').textContent = friendlyModelError(error.message);
  } finally {
    $('#reviewDraft').disabled = false;
  }
}

function renderReview() {
  $('#reviewCount').textContent = reviewIssues.length ? `(${reviewIssues.length})` : '';
  $('#intentNote').textContent = currentIntent ? `${translated('intent_label')}：${currentIntent}` : '';
  $('#intentNote').classList.toggle('hidden', !currentIntent);
  const list = $('#issueList');
  list.textContent = '';
  if (!reviewIssues.length) {
    const empty = document.createElement('div');
    empty.className = 'insight';
    empty.innerHTML = '<span class="insight-mark green">✓</span>';
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    const note = document.createElement('small');
    title.textContent = translated('no_issues');
    note.textContent = translated('no_issues_note');
    copy.append(title, note);
    empty.append(copy);
    list.append(empty);
    return;
  }
  reviewIssues.forEach((issue, index) => {
    const item = document.createElement('div'); item.className = 'review-issue';
    const locate = document.createElement('button'); locate.type = 'button'; locate.className = 'issue-locate';
    const categoryKey = issue.category === 'tone' ? 'tone_category' : (issue.category || 'wording');
    const heading = document.createElement('strong'); heading.textContent = translated(categoryKey);
    const quote = document.createElement('del'); quote.textContent = issue.quote;
    const arrow = document.createElement('span'); arrow.textContent = '→';
    const replacement = document.createElement('ins'); replacement.textContent = issue.replacement;
    const message = document.createElement('small'); message.textContent = issue.message;
    locate.append(heading, quote, arrow, replacement, message);
    locate.addEventListener('click', () => { editor.focus(); editor.setSelectionRange(issue.start, issue.end); });
    const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'issue-apply'; apply.textContent = translated('apply');
    apply.addEventListener('click', () => applyReviewIssue(index));
    item.append(locate, apply); list.appendChild(item);
  });
}

function applyReviewIssue(index) {
  const issue = reviewIssues[index];
  if (!issue) return;
  editor.setRangeText(issue.replacement, issue.start, issue.end, 'end');
  reviewIssues = []; renderMirror(); renderReview(); updateStats(); saveDraft(); scheduleCompletion(); scheduleReview();
  editor.focus(); notify(translated('suggestion_applied'));
}

function saveDraft() {
  if (currentFileName) fileDirty = true;
  saveStatus.textContent = translated('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const draft = { format: $('#format').value, title: $('#title').value, text: editor.value, recipient: $('#recipient').value, subject: $('#subject').value };
    storageSet('draft', JSON.stringify(draft));
    saveStatus.textContent = translated('saved');
  }, 450);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function finishedDocuments() {
  try {
    const documents = JSON.parse(storageGet('finished') || '[]');
    return Array.isArray(documents) ? documents : [];
  } catch {
    return [];
  }
}

function currentDocument() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    format: $('#format').value,
    title: $('#title').value.trim() || 'Untitled document',
    recipient: $('#recipient').value.trim(),
    subject: $('#subject').value.trim(),
    text: editor.value,
    finishedAt: new Date().toISOString()
  };
}

function updateDocumentCounts() {
  $('#draftCount').textContent = '1';
  $('#finishedCount').textContent = String(finishedDocuments().length);
}

function showDocumentView(view) {
  const showingFinished = view === 'finished';
  $('#composeView').classList.toggle('hidden', showingFinished);
  $('#finishedView').classList.toggle('hidden', !showingFinished);
  $('#draftsNav').classList.toggle('active', !showingFinished);
  $('#finishedNav').classList.toggle('active', showingFinished);
  if (showingFinished) renderFinishedDocuments();
}

function formatFinishedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently finished';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function renderFinishedDocuments() {
  const list = $('#finishedList');
  const documents = finishedDocuments();
  list.textContent = '';
  updateDocumentCounts();
  if (!documents.length) {
    const empty = document.createElement('div'); empty.className = 'archive-empty';
    const title = document.createElement('strong'); title.textContent = 'Nothing finished yet';
    const note = document.createElement('span'); note.textContent = 'Complete a letter, essay, or message and it will appear here.';
    empty.append(title, note); list.appendChild(empty); return;
  }
  documents.forEach(documentRecord => {
    const item = document.createElement('article'); item.className = 'finished-item'; item.dataset.finishedId = documentRecord.id;
    const copy = document.createElement('div'); copy.className = 'finished-copy';
    const title = document.createElement('strong'); title.textContent = documentRecord.title || 'Untitled document';
    const meta = document.createElement('div'); meta.className = 'finished-meta';
    const words = (documentRecord.text || '').trim().split(/\s+/).filter(Boolean).length;
    [documentRecord.format || 'document', formatFinishedDate(documentRecord.finishedAt), `${words} words`].forEach(value => {
      const detail = document.createElement('span'); detail.textContent = value; meta.appendChild(detail);
    });
    copy.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'finished-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit copy'; edit.dataset.finishedAction = 'edit';
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete'; remove.className = 'delete-finished'; remove.dataset.finishedAction = 'delete';
    actions.append(edit, remove); item.append(copy, actions); list.appendChild(item);
  });
}

function archiveCurrentDocument() {
  const documents = finishedDocuments();
  documents.unshift(currentDocument());
  storageSet('finished', JSON.stringify(documents.slice(0, 50)));
  updateDocumentCounts();
}

function loadFinishedCopy(id) {
  const documentRecord = finishedDocuments().find(item => item.id === id);
  if (!documentRecord) return;
  detachLocalDocument();
  const format = content[documentRecord.format] ? documentRecord.format : 'letter';
  $('#format').value = format; setFormat(format, false);
  $('#title').value = documentRecord.title || content[format].title;
  $('#recipient').value = documentRecord.recipient || '';
  $('#subject').value = documentRecord.subject || '';
  editor.value = documentRecord.text || '';
  editor.setSelectionRange(editor.value.length, editor.value.length);
  renderMirror(); updateStats(); saveDraft(); showDocumentView('drafts'); editor.focus();
  notify('Finished document copied to drafts');
}

function deleteFinishedDocument(id) {
  if (!window.confirm('Delete this finished document? This cannot be undone.')) return;
  const documents = finishedDocuments().filter(item => item.id !== id);
  storageSet('finished', JSON.stringify(documents));
  renderFinishedDocuments(); notify('Finished document deleted');
}

function closeDocumentMenu() {
  $('#documentMenu').classList.add('hidden');
  $('#moreButton').setAttribute('aria-expanded', 'false');
}

function toggleDocumentMenu() {
  const opening = $('#documentMenu').classList.contains('hidden');
  $('#documentMenu').classList.toggle('hidden', !opening);
  $('#moreButton').setAttribute('aria-expanded', String(opening));
  if (opening) document.querySelector('[data-doc-action="review"]').focus();
}

function desktopDocumentApi() {
  return window.pywebview?.api || null;
}

function updateNativeFileActions() {
  const available = Boolean(desktopDocumentApi());
  document.querySelectorAll('[data-desktop-file]').forEach(button => button.classList.toggle('hidden', !available));
}

window.addEventListener('pywebviewready', updateNativeFileActions);
window.addEventListener('beforeunload', event => {
  if (!currentFileName || !fileDirty) return;
  event.preventDefault();
  event.returnValue = '';
});

function suggestedFileName() {
  if (currentFileName) return currentFileName;
  const safeTitle = ($('#title').value || 'writemelo-draft').replace(/[\\/:*?"<>|]+/g, '-').trim();
  return `${safeTitle || 'writemelo-draft'}.txt`;
}

async function openLocalDocument() {
  const api = desktopDocumentApi();
  if (!api) return notify('Open file is available in the Windows desktop app');
  if (currentFileName && fileDirty && !window.confirm('Open another file? Your current changes remain in Drafts but have not been saved to the file.')) return;
  const result = await api.open_document();
  if (result.cancelled) return;
  if (!result.ok) return notify(result.error || 'Could not open the file');
  currentFileName = result.name || '';
  $('#title').value = result.title || 'Untitled document';
  editor.value = result.text || '';
  editor.setSelectionRange(editor.value.length, editor.value.length);
  reviewIssues = [];
  currentIntent = '';
  renderMirror();
  renderReview();
  updateStats();
  saveDraft();
  fileDirty = false;
  saveStatus.textContent = `Opened ${currentFileName}`;
  scheduleCompletion();
  scheduleReview();
  editor.focus();
}

async function saveLocalDocument(saveAs = false, force = false) {
  const api = desktopDocumentApi();
  if (!api) return notify('Native save is available in the Windows desktop app');
  const result = await api.save_document(editor.value, suggestedFileName(), saveAs, force);
  if (result.cancelled) return;
  if (result.conflict) {
    if (window.confirm('This file changed in another application. Overwrite it with the current draft?')) {
      return saveLocalDocument(saveAs, true);
    }
    return;
  }
  if (!result.ok) return notify(result.error || 'Could not save the file');
  currentFileName = result.name || currentFileName;
  fileDirty = false;
  saveStatus.textContent = `Saved ${currentFileName}`;
  notify(`${currentFileName} saved`);
}

async function detachLocalDocument() {
  const api = desktopDocumentApi();
  currentFileName = '';
  fileDirty = false;
  if (api) await api.detach_document();
}

async function runDocumentAction(action) {
  closeDocumentMenu();
  if (action === 'open') return openLocalDocument();
  if (action === 'save') return saveLocalDocument(false);
  if (action === 'save-as') return saveLocalDocument(true);
  if (action === 'review') return reviewDraft(true);
  if (action === 'copy') {
    await copyCurrentDocument();
    return;
  }
  if (action === 'download') {
    const safeName = ($('#title').value || 'writemelo-draft').replace(/[\\/:*?"<>|]+/g, '-').trim();
    const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${safeName}.txt`; link.click();
    URL.revokeObjectURL(url); notify('Draft downloaded');
    return;
  }
  if (action === 'clear' && window.confirm('Clear this draft? This cannot be undone.')) {
    await detachLocalDocument();
    editor.value = ''; $('#subject').value = ''; $('#recipient').value = ''; $('#title').value = 'Untitled letter';
    reviewIssues = []; currentIntent = ''; renderMirror(); renderReview(); updateStats(); saveDraft(); editor.focus(); notify('Draft cleared');
  }
}

function friendlyModelError(message) {
  if (/sign-in|required|session expired/i.test(message || '')) {
    return '请先到账户页面登录，再使用免费试用额度。';
  }
  if (/allowance|usage limit|quota|capacity|neurons/i.test(message || '')) {
    return '今日免费模型额度已用完。你可以稍后再试，或在 Windows 客户端配置自己的模型。';
  }
  if (/connection|reach model|1005[34]|network|fetch/i.test(message || '')) {
    return '模型服务连接暂时中断，系统已自动重试，请稍后再试。';
  }
  return message || '模型服务暂时不可用，请稍后再试。';
}

function renderPhrases() {
  const phrases = content[$('#format').value].phrases;
  $('#phraseList').innerHTML = phrases.map((phrase, index) => {
    const shifted = phrases[(index + phraseOffset) % phrases.length];
    return `<button type="button" data-phrase="${shifted.replace(/"/g, '&quot;')}">${shifted.trim()}...</button>`;
  }).join('');
  document.querySelectorAll('[data-phrase]').forEach(button => button.addEventListener('click', () => {
    const range = currentTextRange();
    const phrase = `${button.dataset.phrase.trim()} `;
    editor.setRangeText(phrase, range.start, range.end, 'end');
    reviewIssues = []; renderMirror(); editor.focus(); updateStats(); scheduleCompletion(); scheduleReview(); saveDraft(); notify('Current sentence replaced');
  }));
}

function currentTextRange() {
  return EnWriteCompletion.getSentenceRange(editor.value, editor.selectionStart, editor.selectionEnd);
}

function openAssist(title) {
  $('#assistTitle').textContent = title;
  $('#assistContent').innerHTML = '<span class="assist-loading">Thinking...</span>';
  $('#assistResult').classList.remove('hidden');
}

async function requestAssist(action) {
  const isSubject = action === 'polish_subject';
  const range = isSubject ? null : currentTextRange();
  const text = isSubject ? $('#subject').value.trim() : range.text;
  if (!text) return notify(isSubject ? 'Write a subject first' : 'Select some text or place the cursor in a sentence');
  assistRange = range;
  openAssist(isSubject ? 'Subject ideas 标题建议' : action === 'polish_text' ? 'Polished versions 正文润色' : action === 'simplify' ? 'Simpler English 简单表达' : 'Meaning and usage 翻译与解释');
  try {
    const response = await fetch('/api/assist', {
      method: 'POST', headers: modelRequestHeaders(),
      body: JSON.stringify({ action, text, context: editor.value, level: currentLevel, language: $('#explanationLanguage').value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Writing help failed');
    if (isSubject) renderSubjectIdeas(data.suggestions || []);
    else if (action === 'polish_text') renderTextIdeas(data.suggestions || []);
    else renderExplanation(data, action === 'simplify');
  } catch (error) {
    $('#assistContent').textContent = friendlyModelError(error.message);
  }
}

function renderSubjectIdeas(suggestions) {
  const container = $('#assistContent');
  container.textContent = '';
  const list = document.createElement('div');
  list.className = 'subject-options';
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'subject-option';
    const title = document.createElement('strong'); title.textContent = suggestion.text;
    const note = document.createElement('small'); note.textContent = `${suggestion.meaning || ''}${suggestion.tone ? ` · ${suggestion.tone}` : ''}`;
    button.append(title, note);
    button.addEventListener('click', () => { $('#subject').value = suggestion.text; saveDraft(); notify('Subject updated'); });
    list.appendChild(button);
  });
  if (!suggestions.length) container.textContent = 'No subject suggestions returned.';
  else container.appendChild(list);
}

function renderTextIdeas(suggestions) {
  const container = $('#assistContent');
  container.textContent = '';
  const list = document.createElement('div');
  list.className = 'subject-options text-options';
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'subject-option';
    const title = document.createElement('strong'); title.textContent = suggestion.text;
    const note = document.createElement('small'); note.textContent = `${suggestion.meaning || ''}${suggestion.tone ? ` · ${suggestion.tone}` : ''}`;
    button.append(title, note);
    button.addEventListener('click', () => {
      if (!assistRange) return;
      editor.setRangeText(suggestion.text, assistRange.start, assistRange.end, 'end');
      editor.focus(); updateStats(); scheduleCompletion(); saveDraft(); notify('Text polished');
    });
    list.appendChild(button);
  });
  if (!suggestions.length) container.textContent = 'No alternatives returned.';
  else container.appendChild(list);
}

function renderExplanation(data, emphasizeSimple) {
  const container = $('#assistContent');
  container.textContent = '';
  [['中文', data.translation], ['说明', data.explanation], ['简单表达', data.simpler]].forEach(([label, value]) => {
    if (!value) return;
    const row = document.createElement('p');
    const tag = document.createElement('span'); tag.className = 'assist-label'; tag.textContent = label;
    row.append(tag, document.createTextNode(value)); container.appendChild(row);
  });
  if (data.simpler && assistRange) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'apply-simple';
    button.textContent = emphasizeSimple ? 'Use this version 使用此表达' : 'Replace with simpler English';
    button.addEventListener('click', () => {
      editor.setRangeText(data.simpler, assistRange.start, assistRange.end, 'end');
      editor.focus(); updateStats(); scheduleCompletion(); saveDraft(); notify('Text simplified');
    });
    container.appendChild(button);
  }
}

function addChatMessage(role, content, extraClass = '') {
  const message = document.createElement('div');
  message.className = `chat-message ${role} ${extraClass}`.trim();
  message.textContent = content;
  $('#chatMessages').appendChild(message);
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
  return message;
}

async function sendChat(message) {
  const text = message.trim();
  if (!text) return;
  addChatMessage('user', text);
  $('#chatInput').value = '';
  const thinking = addChatMessage('assistant', '正在结合你的草稿思考...', 'thinking');
  const hasSelection = editor.selectionStart !== editor.selectionEnd;
  const selection = hasSelection ? editor.value.slice(editor.selectionStart, editor.selectionEnd) : '';
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: modelRequestHeaders(),
      body: JSON.stringify({ message: text, context: `Subject: ${$('#subject').value}\n\n${editor.value}`, selection, history: chatHistory, language: $('#explanationLanguage').value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Chat failed');
    thinking.remove();
    addChatMessage('assistant', data.reply);
    chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
    if (chatHistory.length > 8) chatHistory.splice(0, chatHistory.length - 8);
  } catch (error) {
    thinking.classList.remove('thinking');
    thinking.textContent = friendlyModelError(error.message);
  }
}

function setFormat(format, reset = true) {
  const preset = content[format];
  $('#documentType').textContent = translated(`draft_${format}`);
  $('#finishButton').firstChild.textContent = `${translated(`finish_${format}`)} `;
  $('#addressFields').classList.toggle('hidden', format !== 'letter');
  $('#editorWrap').classList.toggle('standalone', format !== 'letter');
  if (reset) { $('#title').value = preset.title; editor.value = preset.text; }
  reviewIssues = []; currentIntent = ''; renderMirror(); renderReview();
  phraseOffset = 0; renderPhrases(); updateStats(); scheduleCompletion(); scheduleReview(); saveDraft();
}

function acceptSuggestion() {
  if (!activeSuggestion) return;
  let insertion = activeSuggestion;
  const before = editor.value.slice(0, editor.selectionStart);
  if (activeKind !== 'word' && before && !/\s$/.test(before) && insertion && !/^\s/.test(insertion) && /^[A-Za-z0-9]/.test(insertion)) {
    insertion = ` ${insertion}`;
  }
  editor.setRangeText(insertion, editor.selectionStart, editor.selectionEnd, 'end');
  dismissedValue = ''; reviewIssues = []; renderMirror(); updateStats(); clearSuggestion(); saveDraft(); scheduleReview(); editor.focus();
  setTimeout(scheduleCompletion, 50);
}

editor.addEventListener('input', () => { dismissedValue = ''; reviewIssues = []; renderMirror(); updateStats(); scheduleCompletion(); scheduleReview(); saveDraft(); });
editor.addEventListener('click', scheduleCompletion);
editor.addEventListener('scroll', () => { mirror.scrollTop = editor.scrollTop; });
editor.addEventListener('keydown', event => {
  if (event.key === 'Tab' && activeSuggestion) { event.preventDefault(); acceptSuggestion(); }
  if (event.key === 'Escape' && activeSuggestion) { dismissedValue = editor.value; clearSuggestion(); }
});

document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-level]').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected'); currentLevel = button.dataset.level; dismissedValue = ''; scheduleCompletion();
}));

document.querySelectorAll('[data-completion]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-completion]').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  completionMode = button.dataset.completion;
  storageSet('completion-mode', completionMode);
  dismissedValue = '';
  scheduleCompletion();
}));

$('#format').addEventListener('change', event => setFormat(event.target.value));
$('#relationship').addEventListener('change', scheduleCompletion);
$('#tone').addEventListener('change', scheduleCompletion);
$('#newDraftButton').addEventListener('click', () => { detachLocalDocument(); showDocumentView('drafts'); setFormat($('#format').value); });
$('#archiveNewDraft').addEventListener('click', () => { detachLocalDocument(); showDocumentView('drafts'); setFormat($('#format').value); });
$('#draftsNav').addEventListener('click', () => showDocumentView('drafts'));
$('#finishedNav').addEventListener('click', () => showDocumentView('finished'));
$('#finishedList').addEventListener('click', event => {
  const action = event.target.closest('[data-finished-action]');
  if (!action) return;
  const item = action.closest('[data-finished-id]');
  if (action.dataset.finishedAction === 'edit') loadFinishedCopy(item.dataset.finishedId);
  else deleteFinishedDocument(item.dataset.finishedId);
});
$('#refreshPhrases').addEventListener('click', () => { phraseOffset = (phraseOffset + 1) % 3; renderPhrases(); notify('Phrase ideas refreshed'); });
$('#reviewDraft').addEventListener('click', () => reviewDraft(true));
$('#copyDocumentButton').addEventListener('click', copyCurrentDocument);
$('#finishButton').addEventListener('click', () => {
  archiveCurrentDocument();
  showDocumentView('finished');
  notify(`${content[$('#format').value].finish} saved to Finished`);
});
$('#themeButton').addEventListener('click', () => document.body.classList.toggle('dark'));
function closeAccessGuide() {
  $('#accessGuideModal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  $('#accessGuideButton').focus();
}
$('#accessGuideButton').addEventListener('click', () => {
  $('#accessGuideModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  $('#closeAccessGuide').focus();
});
$('#closeAccessGuide').addEventListener('click', closeAccessGuide);
$('#accessGuideBackdrop').addEventListener('click', closeAccessGuide);
function closePreferences() {
  $('#preferencesModal').classList.add('hidden');
  document.body.classList.remove('modal-open');
}

async function copyCurrentDocument() {
  const format = $('#format').value;
  const parts = [];
  if (format === 'letter' && $('#recipient').value.trim()) parts.push(`${translated('to')}: ${$('#recipient').value.trim()}`);
  if (format === 'letter' && $('#subject').value.trim()) parts.push(`${translated('subject')}: ${$('#subject').value.trim()}`);
  if ($('#title').value.trim()) parts.push($('#title').value.trim());
  if (editor.value.trim()) parts.push(editor.value.trim());
  try {
    await navigator.clipboard.writeText(parts.join('\n\n'));
    notify(activeUiLanguage === 'zh' ? '全文已复制' : 'Document copied');
  } catch {
    notify(activeUiLanguage === 'zh' ? '无法访问剪贴板' : 'Clipboard access was blocked');
  }
}
$('#closePreferences').addEventListener('click', closePreferences);
$('#preferencesBackdrop').addEventListener('click', closePreferences);
$('#preferencesForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('#uiLanguage').value || 'auto';
  storageSet('ui-language', value);
  applyUiLanguage(value);
  closePreferences();
});
$('#settingsButton').addEventListener('click', openModelSettings);
$('#closeSettings').addEventListener('click', closeModelSettings);
$('#settingsBackdrop').addEventListener('click', closeModelSettings);
$('#toggleApiKey').addEventListener('click', () => {
  const input = $('#modelApiKey');
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  $('#toggleApiKey').textContent = visible ? 'Show' : 'Hide';
  $('#toggleApiKey').setAttribute('aria-label', visible ? 'Show API key' : 'Hide API key');
});
$('#testModelConnection').addEventListener('click', () => {
  if ($('#settingsForm').reportValidity()) submitModelConfig('/api/config/test');
});
$('#settingsForm').addEventListener('submit', event => {
  event.preventDefault();
  submitModelConfig('/api/config');
});

function setCoachOpen(open) {
  const panel = $('#writingCoach');
  panel.classList.toggle('closed', !open);
  panel.classList.toggle('open', open);
  document.body.classList.toggle('coach-closed', !open);
  $('#coachToggle').setAttribute('aria-expanded', String(open));
}

$('#closeCoach').addEventListener('click', () => setCoachOpen(false));
$('#coachToggle').addEventListener('click', () => setCoachOpen($('#writingCoach').classList.contains('closed')));
document.querySelectorAll('#title, #recipient, #subject').forEach(input => input.addEventListener('input', saveDraft));

suggestionBar.addEventListener('click', acceptSuggestion);
$('#polishSubject').addEventListener('click', () => requestAssist('polish_subject'));
$('#polishText').addEventListener('click', () => requestAssist('polish_text'));
$('#explainText').addEventListener('click', () => requestAssist('explain'));
$('#simplifyText').addEventListener('click', () => requestAssist('simplify'));
$('#closeAssist').addEventListener('click', () => $('#assistResult').classList.add('hidden'));
$('#moreButton').addEventListener('click', event => { event.stopPropagation(); toggleDocumentMenu(); });
document.querySelectorAll('[data-doc-action]').forEach(button => button.addEventListener('click', () => runDocumentAction(button.dataset.docAction)));
document.addEventListener('click', event => {
  if (!event.target.closest('.more-menu-wrap')) closeDocumentMenu();
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && desktopDocumentApi()) {
    const key = event.key.toLowerCase();
    if (key === 'o') { event.preventDefault(); openLocalDocument(); return; }
    if (key === 's') { event.preventDefault(); saveLocalDocument(event.shiftKey); return; }
  }
  if (event.key === 'Escape' && !$('#settingsModal').classList.contains('hidden')) closeModelSettings();
  if (event.key === 'Escape' && !$('#accessGuideModal').classList.contains('hidden')) closeAccessGuide();
  if (event.key === 'Escape' && !$('#documentMenu').classList.contains('hidden')) { closeDocumentMenu(); $('#moreButton').focus(); }
});
document.querySelectorAll('[data-coach-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-coach-tab]').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  const chatOpen = button.dataset.coachTab === 'chat';
  $('#coachView').classList.toggle('hidden', chatOpen);
  $('#chatView').classList.toggle('hidden', !chatOpen);
  if (chatOpen) $('#chatInput').focus();
}));
$('#chatForm').addEventListener('submit', event => { event.preventDefault(); sendChat($('#chatInput').value); });
document.querySelectorAll('[data-chat-prompt]').forEach(button => button.addEventListener('click', () => sendChat(button.dataset.chatPrompt)));
const languageByLocale = { zh: 'Chinese', es: 'Spanish', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German', pt: 'Portuguese', ar: 'Arabic', hi: 'Hindi', ru: 'Russian', en: 'English' };
$('#explanationLanguage').addEventListener('change', event => {
  storageSet('explanation-language', event.target.value);
  completionCache.clear();
  scheduleReview();
});

function loadScopedWorkspace() {
  detachLocalDocument();
  applyUiLanguage(storageGet('ui-language') || 'auto');
  $('#explanationLanguage').value = storageGet('explanation-language') || languageByLocale[(navigator.language || 'en').slice(0, 2)] || 'English';
  const savedCompletionMode = storageGet('completion-mode');
  completionMode = ['off', 'auto', 'word', 'phrase', 'sentence'].includes(savedCompletionMode) ? savedCompletionMode : 'auto';
  document.querySelectorAll('[data-completion]').forEach(button => {
    button.classList.toggle('selected', button.dataset.completion === completionMode);
  });
  const saved = storageGet('draft');
  if (saved) {
    try {
      const draft = JSON.parse(saved);
      $('#format').value = draft.format || 'letter'; setFormat($('#format').value, false);
      $('#title').value = draft.title || content[$('#format').value].title;
      editor.value = draft.text || content[$('#format').value].text;
      $('#recipient').value = draft.recipient || ''; $('#subject').value = draft.subject || '';
    } catch { setFormat('letter'); }
  } else {
    $('#recipient').value = '';
    $('#subject').value = '';
    setFormat('letter', false);
  }
  reviewIssues = [];
  currentIntent = '';
  chatHistory.splice(0);
  editor.setSelectionRange(editor.value.length, editor.value.length);
  renderMirror();
  updateStats();
  renderPhrases();
  updateDocumentCounts();
}

async function initializeApp() {
  clearLegacyStorage();
  await checkModel();
  loadScopedWorkspace();
  scheduleCompletion();
  setCoachOpen(window.innerWidth > 1050);
}

initializeApp();
