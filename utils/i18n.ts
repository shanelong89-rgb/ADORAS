/**
 * Internationalization (i18n) System
 * Provides translations for the entire Adoras app
 */

import { AppLanguage } from '../App';

export type TranslationKey = keyof typeof translations.english;

// All translations for the app
export const translations = {
  english: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    done: 'Done',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    
    // Navigation
    prompts: 'Prompts',
    chat: 'Chat',
    mediaLibrary: 'Media Library',
    settings: 'Settings',
    
    // Dashboard
    dailyPrompt: 'Daily Prompt',
    conversations: 'Conversations',
    memories: 'Memories',
    
    // Chat Tab
    typeMessage: 'Type a message...',
    voiceMemo: 'Voice Memo',
    sendPhoto: 'Send Photo',
    sendVideo: 'Send Video',
    sendDocument: 'Send Document',
    recording: 'Recording',
    stopRecording: 'Stop Recording',
    transcribe: 'Transcribe',
    translate: 'Translate',
    showOriginal: 'Show Original',
    hideTranscription: 'Hide Transcription',
    
    // Prompts Tab
    todaysPrompt: "Today's Prompt",
    answerPrompt: 'Answer Prompt',
    skipPrompt: 'Skip Prompt',
    pastPrompts: 'Past Prompts',
    noPromptsYet: 'No prompts yet',
    
    // Media Library
    photos: 'Photos',
    videos: 'Videos',
    voice: 'Voice Memos',
    documents: 'Documents',
    allMedia: 'All Media',
    noMediaYet: 'No media yet',
    
    // Settings
    account: 'Account',
    notifications: 'Notifications',
    privacy: 'Privacy',
    help: 'Help',
    logout: 'Logout',
    storageData: 'Storage & Data',
    
    // Account Settings
    profile: 'Profile',
    name: 'Name',
    email: 'Email',
    phoneNumber: 'Phone Number',
    birthday: 'Birthday',
    relationship: 'Relationship',
    bio: 'Bio',
    profilePhoto: 'Photo',
    appLanguage: 'App Language',
    
    // Languages
    languageEnglish: 'English',
    languageSpanish: 'Spanish',
    languageFrench: 'French',
    languageChinese: 'Chinese',
    languageKorean: 'Korean',
    languageJapanese: 'Japanese',
    
    // Onboarding
    welcome: 'Welcome to Adoras',
    welcomeMessage: 'Reconnect through shared memories, stories, and moments',
    getStarted: 'Get Started',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    
    // User Types
    legacyKeeper: 'Legacy Keeper',
    storyteller: 'Storyteller',
    legacyKeeperDesc: 'Create connections and collect family memories',
    storytellerDesc: 'Share your stories and memories with loved ones',
    
    // Invitations
    createInvitation: 'Create Invitation',
    acceptInvitation: 'Accept Invitation',
    invitationCode: 'Invitation Code',
    sendInvitation: 'Send Invitation',
    pendingInvitations: 'Pending Invitations',
    
    // Connections
    connected: 'Connected',
    notConnected: 'Not Connected',
    connectNow: 'Connect Now',
    noConnectionYet: 'No Connection Yet',
    
    // Memory Types
    text: 'Text',
    photo: 'Photo',
    video: 'Video',
    document: 'Document',
    
    // Categories
    family: 'Family',
    travel: 'Travel',
    childhood: 'Childhood',
    traditions: 'Traditions',
    stories: 'Stories',
    
    // Errors
    errorOccurred: 'An error occurred',
    tryAgain: 'Try Again',
    somethingWentWrong: 'Something went wrong',
    
    // Success Messages
    savedSuccessfully: 'Saved successfully',
    deletedSuccessfully: 'Deleted successfully',
    uploadedSuccessfully: 'Uploaded successfully',
    
    // Voice Recording
    tapToTranscribe: 'Tap to transcribe',
    transcribing: 'Transcribing...',
    detectedLanguage: 'Detected Language',
    originalLanguage: 'Original Language',
    
    // Permissions
    microphoneAccess: 'Microphone Access',
    cameraAccess: 'Camera Access',
    allowAccess: 'Allow Access',
    accessDenied: 'Access Denied',
  },
  
  spanish: {
    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    confirm: 'Confirmar',
    back: 'Atrás',
    next: 'Siguiente',
    skip: 'Omitir',
    done: 'Hecho',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    
    // Navigation
    prompts: 'Preguntas',
    chat: 'Chat',
    mediaLibrary: 'Biblioteca',
    settings: 'Ajustes',
    
    // Dashboard
    dailyPrompt: 'Pregunta Diaria',
    conversations: 'Conversaciones',
    memories: 'Recuerdos',
    
    // Chat Tab
    typeMessage: 'Escribe un mensaje...',
    voiceMemo: 'Nota de Voz',
    sendPhoto: 'Enviar Foto',
    sendVideo: 'Enviar Video',
    sendDocument: 'Enviar Documento',
    recording: 'Grabando',
    stopRecording: 'Detener Grabación',
    transcribe: 'Transcribir',
    translate: 'Traducir',
    showOriginal: 'Mostrar Original',
    hideTranscription: 'Ocultar Transcripción',
    
    // Prompts Tab
    todaysPrompt: 'Pregunta de Hoy',
    answerPrompt: 'Responder',
    skipPrompt: 'Omitir',
    pastPrompts: 'Preguntas Anteriores',
    noPromptsYet: 'No hay preguntas aún',
    
    // Media Library
    photos: 'Fotos',
    videos: 'Videos',
    voice: 'Notas de Voz',
    documents: 'Documentos',
    allMedia: 'Todo',
    noMediaYet: 'No hay medios aún',
    
    // Settings
    account: 'Cuenta',
    notifications: 'Notificaciones',
    privacy: 'Privacidad',
    help: 'Ayuda',
    logout: 'Cerrar Sesión',
    storageData: 'Almacenamiento & Datos',
    
    // Account Settings
    profile: 'Perfil',
    name: 'Nombre',
    email: 'Correo',
    phoneNumber: 'Teléfono',
    birthday: 'Cumpleaños',
    relationship: 'Relación',
    bio: 'Biografía',
    profilePhoto: 'Foto',
    appLanguage: 'Idioma',
    
    // Languages
    languageEnglish: 'Inglés',
    languageSpanish: 'Español',
    languageFrench: 'Francés',
    languageChinese: 'Chino',
    languageKorean: 'Coreano',
    languageJapanese: 'Japonés',
    
    // Onboarding
    welcome: 'Bienvenido a Adoras',
    welcomeMessage: 'Reconecta a través de recuerdos, historias y momentos compartidos',
    getStarted: 'Comenzar',
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    
    // User Types
    legacyKeeper: 'Guardián',
    storyteller: 'Narrador',
    legacyKeeperDesc: 'Crea conexiones y colecciona recuerdos familiares',
    storytellerDesc: 'Comparte tus historias y recuerdos con seres queridos',
    
    // Invitations
    createInvitation: 'Crear Invitación',
    acceptInvitation: 'Aceptar Invitación',
    invitationCode: 'Código de Invitación',
    sendInvitation: 'Enviar Invitación',
    pendingInvitations: 'Invitaciones Pendientes',
    
    // Connections
    connected: 'Conectado',
    notConnected: 'No Conectado',
    connectNow: 'Conectar Ahora',
    noConnectionYet: 'Sin Conexión Aún',
    
    // Memory Types
    text: 'Texto',
    photo: 'Foto',
    video: 'Video',
    document: 'Documento',
    
    // Categories
    family: 'Familia',
    travel: 'Viajes',
    childhood: 'Infancia',
    traditions: 'Tradiciones',
    stories: 'Historias',
    
    // Errors
    errorOccurred: 'Ocurrió un error',
    tryAgain: 'Intentar de Nuevo',
    somethingWentWrong: 'Algo salió mal',
    
    // Success Messages
    savedSuccessfully: 'Guardado exitosamente',
    deletedSuccessfully: 'Eliminado exitosamente',
    uploadedSuccessfully: 'Subido exitosamente',
    
    // Voice Recording
    tapToTranscribe: 'Toca para transcribir',
    transcribing: 'Transcribiendo...',
    detectedLanguage: 'Idioma Detectado',
    originalLanguage: 'Idioma Original',
    
    // Permissions
    microphoneAccess: 'Acceso al Micrófono',
    cameraAccess: 'Acceso a la Cámara',
    allowAccess: 'Permitir Acceso',
    accessDenied: 'Acceso Denegado',
  },
  
  french: {
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    confirm: 'Confirmer',
    back: 'Retour',
    next: 'Suivant',
    skip: 'Passer',
    done: 'Terminé',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    
    // Navigation
    prompts: 'Questions',
    chat: 'Chat',
    mediaLibrary: 'Bibliothèque',
    settings: 'Paramètres',
    
    // Dashboard
    dailyPrompt: 'Question du Jour',
    conversations: 'Conversations',
    memories: 'Souvenirs',
    
    // Chat Tab
    typeMessage: 'Tapez un message...',
    voiceMemo: 'Mémo Vocal',
    sendPhoto: 'Envoyer Photo',
    sendVideo: 'Envoyer Vidéo',
    sendDocument: 'Envoyer Document',
    recording: 'Enregistrement',
    stopRecording: 'Arrêter',
    transcribe: 'Transcrire',
    translate: 'Traduire',
    showOriginal: 'Afficher Original',
    hideTranscription: 'Masquer Transcription',
    
    // Prompts Tab
    todaysPrompt: "Question d'Aujourd'hui",
    answerPrompt: 'Répondre',
    skipPrompt: 'Passer',
    pastPrompts: 'Questions Précédentes',
    noPromptsYet: 'Pas encore de questions',
    
    // Media Library
    photos: 'Photos',
    videos: 'Vidéos',
    voice: 'Mémos Vocaux',
    documents: 'Documents',
    allMedia: 'Tout',
    noMediaYet: 'Pas encore de médias',
    
    // Settings
    account: 'Compte',
    notifications: 'Notifications',
    privacy: 'Confidentialité',
    help: 'Aide',
    logout: 'Déconnexion',
    storageData: 'Stockage & Données',
    
    // Account Settings
    profile: 'Profil',
    name: 'Nom',
    email: 'Email',
    phoneNumber: 'Téléphone',
    birthday: 'Anniversaire',
    relationship: 'Relation',
    bio: 'Biographie',
    profilePhoto: 'Photo',
    appLanguage: 'Langue',
    
    // Languages
    languageEnglish: 'Anglais',
    languageSpanish: 'Espagnol',
    languageFrench: 'Français',
    languageChinese: 'Chinois',
    languageKorean: 'Coréen',
    languageJapanese: 'Japonais',
    
    // Onboarding
    welcome: 'Bienvenue sur Adoras',
    welcomeMessage: 'Reconnectez-vous grâce aux souvenirs, histoires et moments partagés',
    getStarted: 'Commencer',
    signIn: 'Se Connecter',
    signUp: "S'inscrire",
    
    // User Types
    legacyKeeper: 'Gardien',
    storyteller: 'Conteur',
    legacyKeeperDesc: 'Créez des connexions et collectez des souvenirs familiaux',
    storytellerDesc: 'Partagez vos histoires et souvenirs avec vos proches',
    
    // Invitations
    createInvitation: 'Créer une Invitation',
    acceptInvitation: 'Accepter une Invitation',
    invitationCode: "Code d'Invitation",
    sendInvitation: 'Envoyer Invitation',
    pendingInvitations: 'Invitations en Attente',
    
    // Connections
    connected: 'Connecté',
    notConnected: 'Non Connecté',
    connectNow: 'Connecter Maintenant',
    noConnectionYet: 'Pas Encore de Connexion',
    
    // Memory Types
    text: 'Texte',
    photo: 'Photo',
    video: 'Vidéo',
    document: 'Document',
    
    // Categories
    family: 'Famille',
    travel: 'Voyages',
    childhood: 'Enfance',
    traditions: 'Traditions',
    stories: 'Histoires',
    
    // Errors
    errorOccurred: "Une erreur s'est produite",
    tryAgain: 'Réessayer',
    somethingWentWrong: "Quelque chose s'est mal passé",
    
    // Success Messages
    savedSuccessfully: 'Enregistré avec succès',
    deletedSuccessfully: 'Supprimé avec succès',
    uploadedSuccessfully: 'Téléchargé avec succès',
    
    // Voice Recording
    tapToTranscribe: 'Appuyez pour transcrire',
    transcribing: 'Transcription...',
    detectedLanguage: 'Langue Détectée',
    originalLanguage: 'Langue Originale',
    
    // Permissions
    microphoneAccess: 'Accès au Microphone',
    cameraAccess: 'Accès à la Caméra',
    allowAccess: 'Autoriser',
    accessDenied: 'Accès Refusé',
  },
  
  chinese: {
    // Common
    save: '保存',
    cancel: '取消',
    delete: '刪除',
    edit: '編輯',
    close: '關閉',
    confirm: '確認',
    back: '返回',
    next: '下一步',
    skip: '跳過',
    done: '完成',
    loading: '加載中...',
    error: '錯誤',
    success: '成功',
    search: '搜索',
    filter: '篩選',
    sort: '排序',
    
    // Navigation
    prompts: '提示',
    chat: '聊天',
    mediaLibrary: '媒體庫',
    settings: '設置',
    
    // Dashboard
    dailyPrompt: '每日提示',
    conversations: '對話',
    memories: '回憶',
    
    // Chat Tab
    typeMessage: '輸入訊息...',
    voiceMemo: '語音備忘',
    sendPhoto: '發送照片',
    sendVideo: '發送視頻',
    sendDocument: '發送文檔',
    recording: '錄音中',
    stopRecording: '停止錄音',
    transcribe: '轉錄',
    translate: '翻譯',
    showOriginal: '顯示原文',
    hideTranscription: '隱藏轉錄',
    
    // Prompts Tab
    todaysPrompt: '今日提示',
    answerPrompt: '回答',
    skipPrompt: '跳過',
    pastPrompts: '過往提示',
    noPromptsYet: '尚無提示',
    
    // Media Library
    photos: '照片',
    videos: '視頻',
    voice: '語音備忘',
    documents: '文檔',
    allMedia: '全部',
    noMediaYet: '尚無媒體',
    
    // Settings
    account: '帳戶',
    notifications: '通知',
    privacy: '隱私',
    help: '幫助',
    logout: '登出',
    storageData: '存儲 & 數據',
    
    // Account Settings
    profile: '個人資料',
    name: '姓名',
    email: '電郵',
    phoneNumber: '電話',
    birthday: '生日',
    relationship: '關係',
    bio: '簡介',
    profilePhoto: '照片',
    appLanguage: '語言',
    
    // Languages
    languageEnglish: '英文',
    languageSpanish: '西班牙文',
    languageFrench: '法文',
    languageChinese: '中文',
    languageKorean: '韓文',
    languageJapanese: '日文',
    
    // Onboarding
    welcome: '歡迎來到 Adoras',
    welcomeMessage: '透過共享的回憶、故事和時刻重新連結',
    getStarted: '開始使用',
    signIn: '登入',
    signUp: '註冊',
    
    // User Types
    legacyKeeper: '傳承守護者',
    storyteller: '故事分享者',
    legacyKeeperDesc: '創建連接並收集家庭回憶',
    storytellerDesc: '與親人分享您的故事和回憶',
    
    // Invitations
    createInvitation: '創建邀請',
    acceptInvitation: '接受邀請',
    invitationCode: '邀請碼',
    sendInvitation: '發送邀請',
    pendingInvitations: '待處理邀請',
    
    // Connections
    connected: '已連接',
    notConnected: '未連接',
    connectNow: '立即連接',
    noConnectionYet: '尚未連接',
    
    // Memory Types
    text: '文字',
    photo: '照片',
    video: '視頻',
    document: '文檔',
    
    // Categories
    family: '家庭',
    travel: '旅行',
    childhood: '童年',
    traditions: '傳統',
    stories: '故事',
    
    // Errors
    errorOccurred: '發生錯誤',
    tryAgain: '重試',
    somethingWentWrong: '出了些問題',
    
    // Success Messages
    savedSuccessfully: '保存成功',
    deletedSuccessfully: '刪除成功',
    uploadedSuccessfully: '上傳成功',
    
    // Voice Recording
    tapToTranscribe: '點擊轉錄',
    transcribing: '轉錄中...',
    detectedLanguage: '檢測到的語言',
    originalLanguage: '原始語言',
    
    // Permissions
    microphoneAccess: '麥克風訪問',
    cameraAccess: '相機訪問',
    allowAccess: '允許訪問',
    accessDenied: '訪問被拒絕',
  },
  
  korean: {
    // Common
    save: '저장',
    cancel: '취소',
    delete: '삭제',
    edit: '편집',
    close: '닫기',
    confirm: '확인',
    back: '뒤로',
    next: '다음',
    skip: '건너뛰기',
    done: '완료',
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    search: '검색',
    filter: '필터',
    sort: '정렬',
    
    // Navigation
    prompts: '프롬프트',
    chat: '채팅',
    mediaLibrary: '미디어 라이브러리',
    settings: '설정',
    
    // Dashboard
    dailyPrompt: '오늘의 프롬프트',
    conversations: '대화',
    memories: '추억',
    
    // Chat Tab
    typeMessage: '메시지를 입력하세요...',
    voiceMemo: '음성 메모',
    sendPhoto: '사진 보내기',
    sendVideo: '동영상 보내기',
    sendDocument: '문서 보내기',
    recording: '녹음 중',
    stopRecording: '녹음 중지',
    transcribe: '전사',
    translate: '번역',
    showOriginal: '원본 보기',
    hideTranscription: '전사 숨기기',
    
    // Prompts Tab
    todaysPrompt: '오늘의 프롬프트',
    answerPrompt: '답변',
    skipPrompt: '건너뛰기',
    pastPrompts: '이전 프롬프트',
    noPromptsYet: '아직 프롬프트가 없습니다',
    
    // Media Library
    photos: '사진',
    videos: '동영상',
    voice: '음성 메모',
    documents: '문서',
    allMedia: '전체',
    noMediaYet: '아직 미디어가 없습니다',
    
    // Settings
    account: '계정',
    notifications: '알림',
    privacy: '개인정보',
    help: '도움말',
    logout: '로그아웃',
    storageData: '저장소 & 데이터',
    
    // Account Settings
    profile: '프로필',
    name: '이름',
    email: '이메일',
    phoneNumber: '전화번호',
    birthday: '생일',
    relationship: '관계',
    bio: '소개',
    profilePhoto: '사진',
    appLanguage: '언어',
    
    // Languages
    languageEnglish: '영어',
    languageSpanish: '스페인어',
    languageFrench: '프랑스어',
    languageChinese: '중국어',
    languageKorean: '한국어',
    languageJapanese: '일본어',
    
    // Onboarding
    welcome: 'Adoras에 오신 것을 환영합니다',
    welcomeMessage: '공유된 추억, 이야기, 순간을 통해 다시 연결하세요',
    getStarted: '시작하기',
    signIn: '로그인',
    signUp: '회원가입',
    
    // User Types
    legacyKeeper: '레거시 키퍼',
    storyteller: '스토리텔러',
    legacyKeeperDesc: '연결을 만들고 가족 추억을 수집하세요',
    storytellerDesc: '사랑하는 사람들과 이야기와 추억을 공유하세요',
    
    // Invitations
    createInvitation: '초대 만들기',
    acceptInvitation: '초대 수락',
    invitationCode: '초대 코드',
    sendInvitation: '초대 보내기',
    pendingInvitations: '대기 중인 초대',
    
    // Connections
    connected: '연결됨',
    notConnected: '연결 안 됨',
    connectNow: '지금 연결',
    noConnectionYet: '아직 연결 없음',
    
    // Memory Types
    text: '텍스트',
    photo: '사진',
    video: '동영상',
    document: '문서',
    
    // Categories
    family: '가족',
    travel: '여행',
    childhood: '어린 시절',
    traditions: '전통',
    stories: '이야기',
    
    // Errors
    errorOccurred: '오류가 발생했습니다',
    tryAgain: '다시 시도',
    somethingWentWrong: '문제가 발생했습니다',
    
    // Success Messages
    savedSuccessfully: '저장되었습니다',
    deletedSuccessfully: '삭제되었습니다',
    uploadedSuccessfully: '업로드되었습니다',
    
    // Voice Recording
    tapToTranscribe: '탭하여 전사',
    transcribing: '전사 중...',
    detectedLanguage: '감지된 언어',
    originalLanguage: '원본 언어',
    
    // Permissions
    microphoneAccess: '마이크 액세스',
    cameraAccess: '카메라 액세스',
    allowAccess: '액세스 허용',
    accessDenied: '액세스 거부됨',
  },
  
  japanese: {
    // Common
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    edit: '編集',
    close: '閉じる',
    confirm: '確認',
    back: '戻る',
    next: '次へ',
    skip: 'スキップ',
    done: '完了',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    search: '検索',
    filter: 'フィルター',
    sort: '並べ替え',
    
    // Navigation
    prompts: 'プロンプト',
    chat: 'チャット',
    mediaLibrary: 'メディアライブラリ',
    settings: '設定',
    
    // Dashboard
    dailyPrompt: '今日のプロンプト',
    conversations: '会話',
    memories: '思い出',
    
    // Chat Tab
    typeMessage: 'メッセージを入力...',
    voiceMemo: 'ボイスメモ',
    sendPhoto: '写真を送信',
    sendVideo: '動画を送信',
    sendDocument: 'ドキュメントを送信',
    recording: '録音中',
    stopRecording: '録音停止',
    transcribe: '文字起こし',
    translate: '翻訳',
    showOriginal: '原文を表示',
    hideTranscription: '文字起こしを非表示',
    
    // Prompts Tab
    todaysPrompt: '今日のプロンプト',
    answerPrompt: '回答',
    skipPrompt: 'スキップ',
    pastPrompts: '過去のプロンプト',
    noPromptsYet: 'まだプロンプトがありません',
    
    // Media Library
    photos: '写真',
    videos: '動画',
    voice: 'ボイスメモ',
    documents: 'ドキュメント',
    allMedia: 'すべて',
    noMediaYet: 'まだメディアがありません',
    
    // Settings
    account: 'アカウント',
    notifications: '通知',
    privacy: 'プライバシー',
    help: 'ヘルプ',
    logout: 'ログアウト',
    storageData: 'ストレージ & データ',
    
    // Account Settings
    profile: 'プロフィール',
    name: '名前',
    email: 'メール',
    phoneNumber: '電話番号',
    birthday: '誕生日',
    relationship: '関係',
    bio: '自己紹介',
    profilePhoto: '写真',
    appLanguage: '言語',
    
    // Languages
    languageEnglish: '英語',
    languageSpanish: 'スペイン語',
    languageFrench: 'フランス語',
    languageChinese: '中国語',
    languageKorean: '韓国語',
    languageJapanese: '日本語',
    
    // Onboarding
    welcome: 'Adorasへようこそ',
    welcomeMessage: '共有された思い出、物語、瞬間を通じて再接続',
    getStarted: '始める',
    signIn: 'ログイン',
    signUp: '新規登録',
    
    // User Types
    legacyKeeper: 'レガシーキーパー',
    storyteller: 'ストーリーテラー',
    legacyKeeperDesc: 'つながりを作り、家族の思い出を集める',
    storytellerDesc: '愛する人とあなたの物語と思い出を共有',
    
    // Invitations
    createInvitation: '招待を作成',
    acceptInvitation: '招待を受け入れる',
    invitationCode: '招待コード',
    sendInvitation: '招待を送信',
    pendingInvitations: '保留中の招待',
    
    // Connections
    connected: '接続済み',
    notConnected: '未接続',
    connectNow: '今すぐ接続',
    noConnectionYet: 'まだ接続がありません',
    
    // Memory Types
    text: 'テキスト',
    photo: '写真',
    video: '動画',
    document: 'ドキュメント',
    
    // Categories
    family: '家族',
    travel: '旅行',
    childhood: '子供時代',
    traditions: '伝統',
    stories: '物語',
    
    // Errors
    errorOccurred: 'エラーが発生しました',
    tryAgain: '再試行',
    somethingWentWrong: '問題が発生しました',
    
    // Success Messages
    savedSuccessfully: '保存されました',
    deletedSuccessfully: '削除されました',
    uploadedSuccessfully: 'アップロードされました',
    
    // Voice Recording
    tapToTranscribe: 'タップして文字起こし',
    transcribing: '文字起こし中...',
    detectedLanguage: '検出された言語',
    originalLanguage: '元の言語',
    
    // Permissions
    microphoneAccess: 'マイクアクセス',
    cameraAccess: 'カメラアクセス',
    allowAccess: 'アクセスを許可',
    accessDenied: 'アクセスが拒否されました',
  },
};

/**
 * Get translation for a key based on selected language
 */
export function t(key: TranslationKey, language: AppLanguage = 'english'): string {
  const languageTranslations = translations[language];
  return languageTranslations[key] || translations.english[key] || key;
}

/**
 * React hook for translations
 */
import { useMemo } from 'react';

export function useTranslation(language: AppLanguage = 'english') {
  const translate = useMemo(() => {
    return (key: TranslationKey): string => t(key, language);
  }, [language]);
  
  return { t: translate, language };
}