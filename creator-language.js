/* Shared Creators World interface language selector; homepage preference is reused. */
(function () {
  'use strict';
  var key = 'hyphsworld.language';
  var legacyKey = 'hyphsworld.creator.language';
  var labels = { en: 'English', es: 'Español', fr: 'Français', pt: 'Português', tl: 'Tagalog', ko: '한국어', ja: '日本語', zh: '中文' };
  var dictionaries = {
  "es": {
    "Language": "Idioma",
    "Choose site language": "Elegir idioma del sitio",
    "Home": "Inicio",
    "Creators": "Creadores",
    "Access": "Acceso",
    "Apply": "Solicitar acceso",
    "Creator Login": "Acceso de creadores",
    "My ID": "Mi ID",
    "Dashboard": "Panel",
    "Operations": "Operaciones",
    "Music": "Música",
    "Video": "Video",
    "Artwork": "Arte",
    "Merch": "Productos",
    "World": "Mundo",
    "Creator World update": "Actualización de Creator World",
    "Watch": "Ver",
    "Story": "Historia",
    "The Show": "El programa",
    "Highlights": "Destacados",
    "Credits": "Créditos",
    "Build Mode": "Modo construcción",
    "Coach Tools": "Herramientas de entrenador",
    "Overview": "Resumen",
    "Profile": "Perfil",
    "＋ CREATE": "＋ CREAR",
    "CREATE": "CREAR",
    "My Creations": "Mis creaciones",
    "MY CREATIONS": "MIS CREACIONES",
    "Trust & Tools": "Confianza y herramientas",
    "Inbox": "Bandeja de entrada",
    "Display name": "Nombre público",
    "Headline": "Presentación breve",
    "Location": "Ubicación",
    "Categories": "Categorías",
    "Biography": "Biografía",
    "Approved image path": "Ruta de imagen aprobada",
    "Save Profile": "Guardar perfil",
    "What are you creating?": "¿Qué vas a crear?",
    "Title": "Título",
    "Choose a file": "Elegir archivo",
    "Name this creation": "Dale un nombre a tu creación",
    "Open Preview": "Abrir vista previa",
    "Preview": "Vista previa",
    "Rename": "Cambiar nombre",
    "Send for Review": "Enviar a revisión",
    "Make Private": "Volver a privado",
    "＋ CREATE ANOTHER": "＋ CREAR OTRA",
    "Private": "Privado",
    "In review": "En revisión",
    "Changes needed": "Cambios necesarios",
    "Approved": "Aprobado",
    "Live": "Publicado",
    "All": "Todos",
    "Show": "Mostrar",
    "Artists": "Artistas",
    "Producers": "Productores",
    "Radio & DJ": "Radio y DJ",
    "Athletes": "Atletas",
    "Coaches": "Entrenadores",
    "The block": "El barrio",
    "Fresh drops": "Nuevos lanzamientos",
    "World seals": "Sellos World",
    "Build your world": "Construye tu mundo",
    "Build My Creator World": "Crear mi Creator World",
    "Apply now →": "Solicitar ahora →",
    "Enter creator world →": "Entrar al mundo del creador →",
    "Meet the creators ↓": "Conoce a los creadores ↓",
    "Run my world ↗": "Gestionar mi mundo ↗",
    "Search creators": "Buscar creadores",
    "Search name, role, or city…": "Buscar nombre, rol o ciudad…",
    "No creator found.": "No se encontró ningún creador.",
    "Try a different name, role, or location.": "Prueba otro nombre, rol o ubicación.",
    "Request Review": "Solicitar revisión",
    "Badge level": "Nivel de insignia",
    "Identity Check": "Verificación de identidad",
    "Professional": "Profesional",
    "Partner": "Socio",
    "Organization": "Organización",
    "Unverified": "Sin verificar",
    "View access →": "Ver acceso →",
    "Nothing created here yet.": "Todavía no hay creaciones.",
    "No submissions yet.": "Todavía no hay propuestas.",
    "Private • Creator access only • 50 MB max": "Privado • Solo para creadores • Máximo 50 MB",
    "Choose a type, add your file, and name it. Your creation stays private until approved and published.": "Elige un tipo, añade tu archivo y ponle un nombre. Tu creación permanece privada hasta su aprobación y publicación.",
    "Creator World isn’t open enrollment. Apply to build your World.": "Creator World no es de acceso libre. Solicita crear tu mundo.",
    "Your Creator World walkthrough.": "Guía de tu Creator World.",
    "How to go from application to Live": "De la solicitud a la publicación",
    "Checking your account…": "Comprobando tu cuenta…",
    "Checking your application…": "Comprobando tu solicitud…"
  },
  "fr": {
    "Language": "Langue",
    "Choose site language": "Choisir la langue du site",
    "Home": "Accueil",
    "Creators": "Créateurs",
    "Access": "Accès",
    "Apply": "Postuler",
    "Creator Login": "Connexion créateur",
    "My ID": "Mon ID",
    "Dashboard": "Tableau de bord",
    "Operations": "Opérations",
    "Music": "Musique",
    "Video": "Vidéo",
    "Artwork": "Illustration",
    "Merch": "Produits",
    "World": "Monde",
    "Creator World update": "Mise à jour de Creator World",
    "Watch": "Regarder",
    "Story": "Histoire",
    "The Show": "L’émission",
    "Highlights": "Temps forts",
    "Credits": "Crédits",
    "Build Mode": "Mode création",
    "Coach Tools": "Outils d’entraîneur",
    "Overview": "Vue d’ensemble",
    "Profile": "Profil",
    "＋ CREATE": "＋ CRÉER",
    "CREATE": "CRÉER",
    "My Creations": "Mes créations",
    "MY CREATIONS": "MES CRÉATIONS",
    "Trust & Tools": "Confiance et outils",
    "Inbox": "Boîte de réception",
    "Display name": "Nom affiché",
    "Headline": "Présentation courte",
    "Location": "Localisation",
    "Categories": "Catégories",
    "Biography": "Biographie",
    "Approved image path": "Chemin de l’image approuvée",
    "Save Profile": "Enregistrer le profil",
    "What are you creating?": "Que créez-vous ?",
    "Title": "Titre",
    "Choose a file": "Choisir un fichier",
    "Name this creation": "Nommez cette création",
    "Open Preview": "Ouvrir l’aperçu",
    "Preview": "Aperçu",
    "Rename": "Renommer",
    "Send for Review": "Envoyer pour examen",
    "Make Private": "Rendre privé",
    "＋ CREATE ANOTHER": "＋ CRÉER À NOUVEAU",
    "Private": "Privé",
    "In review": "En cours d’examen",
    "Changes needed": "Modifications requises",
    "Approved": "Approuvé",
    "Live": "Publié",
    "All": "Tous",
    "Show": "Afficher",
    "Artists": "Artistes",
    "Producers": "Producteurs",
    "Radio & DJ": "Radio et DJ",
    "Athletes": "Athlètes",
    "Coaches": "Entraîneurs",
    "The block": "Le quartier",
    "Fresh drops": "Nouveautés",
    "World seals": "Sceaux World",
    "Build your world": "Créez votre monde",
    "Build My Creator World": "Créer mon Creator World",
    "Apply now →": "Postuler maintenant →",
    "Enter creator world →": "Entrer dans le monde du créateur →",
    "Meet the creators ↓": "Rencontrez les créateurs ↓",
    "Run my world ↗": "Gérer mon monde ↗",
    "Search creators": "Rechercher des créateurs",
    "Search name, role, or city…": "Rechercher un nom, rôle ou ville…",
    "No creator found.": "Aucun créateur trouvé.",
    "Try a different name, role, or location.": "Essayez un autre nom, rôle ou lieu.",
    "Request Review": "Demander un examen",
    "Badge level": "Niveau du badge",
    "Identity Check": "Vérification d’identité",
    "Professional": "Professionnel",
    "Partner": "Partenaire",
    "Organization": "Organisation",
    "Unverified": "Non vérifié",
    "View access →": "Voir les accès →",
    "Nothing created here yet.": "Aucune création pour le moment.",
    "No submissions yet.": "Aucune proposition pour le moment.",
    "Private • Creator access only • 50 MB max": "Privé • Accès créateur uniquement • 50 Mo max",
    "Choose a type, add your file, and name it. Your creation stays private until approved and published.": "Choisissez un type, ajoutez votre fichier et nommez-le. Votre création reste privée jusqu’à son approbation et sa publication.",
    "Creator World isn’t open enrollment. Apply to build your World.": "Creator World n’est pas ouvert à tous. Postulez pour créer votre monde.",
    "Your Creator World walkthrough.": "Le guide de votre Creator World.",
    "How to go from application to Live": "De la candidature à la publication",
    "Checking your account…": "Vérification de votre compte…",
    "Checking your application…": "Vérification de votre candidature…"
  },
  "pt": {
    "Language": "Idioma",
    "Choose site language": "Escolher idioma do site",
    "Home": "Início",
    "Creators": "Criadores",
    "Access": "Acesso",
    "Apply": "Candidatar-se",
    "Creator Login": "Login do criador",
    "My ID": "Meu ID",
    "Dashboard": "Painel",
    "Operations": "Operações",
    "Music": "Música",
    "Video": "Vídeo",
    "Artwork": "Arte",
    "Merch": "Produtos",
    "World": "Mundo",
    "Creator World update": "Atualização de Creator World",
    "Watch": "Assistir",
    "Story": "História",
    "The Show": "O programa",
    "Highlights": "Destaques",
    "Credits": "Créditos",
    "Build Mode": "Modo construção",
    "Coach Tools": "Ferramentas do treinador",
    "Overview": "Visão geral",
    "Profile": "Perfil",
    "＋ CREATE": "＋ CRIAR",
    "CREATE": "CRIAR",
    "My Creations": "Minhas criações",
    "MY CREATIONS": "MINHAS CRIAÇÕES",
    "Trust & Tools": "Confiança e ferramentas",
    "Inbox": "Caixa de entrada",
    "Display name": "Nome de exibição",
    "Headline": "Apresentação curta",
    "Location": "Localização",
    "Categories": "Categorias",
    "Biography": "Biografia",
    "Approved image path": "Caminho da imagem aprovada",
    "Save Profile": "Salvar perfil",
    "What are you creating?": "O que você está criando?",
    "Title": "Título",
    "Choose a file": "Escolher arquivo",
    "Name this creation": "Dê um nome à criação",
    "Open Preview": "Abrir prévia",
    "Preview": "Prévia",
    "Rename": "Renomear",
    "Send for Review": "Enviar para revisão",
    "Make Private": "Tornar privado",
    "＋ CREATE ANOTHER": "＋ CRIAR OUTRA",
    "Private": "Privado",
    "In review": "Em revisão",
    "Changes needed": "Alterações necessárias",
    "Approved": "Aprovado",
    "Live": "Publicado",
    "All": "Todos",
    "Show": "Mostrar",
    "Artists": "Artistas",
    "Producers": "Produtores",
    "Radio & DJ": "Rádio e DJ",
    "Athletes": "Atletas",
    "Coaches": "Treinadores",
    "The block": "O bairro",
    "Fresh drops": "Novos lançamentos",
    "World seals": "Selos World",
    "Build your world": "Construa seu mundo",
    "Build My Creator World": "Criar meu Creator World",
    "Apply now →": "Candidatar-se agora →",
    "Enter creator world →": "Entrar no mundo do criador →",
    "Meet the creators ↓": "Conheça os criadores ↓",
    "Run my world ↗": "Gerenciar meu mundo ↗",
    "Search creators": "Buscar criadores",
    "Search name, role, or city…": "Buscar nome, função ou cidade…",
    "No creator found.": "Nenhum criador encontrado.",
    "Try a different name, role, or location.": "Tente outro nome, função ou local.",
    "Request Review": "Solicitar revisão",
    "Badge level": "Nível do selo",
    "Identity Check": "Verificação de identidade",
    "Professional": "Profissional",
    "Partner": "Parceiro",
    "Organization": "Organização",
    "Unverified": "Não verificado",
    "View access →": "Ver acesso →",
    "Nothing created here yet.": "Nenhuma criação ainda.",
    "No submissions yet.": "Nenhuma proposta ainda.",
    "Private • Creator access only • 50 MB max": "Privado • Acesso do criador • Máximo 50 MB",
    "Choose a type, add your file, and name it. Your creation stays private until approved and published.": "Escolha um tipo, adicione o arquivo e dê um nome. Sua criação permanece privada até ser aprovada e publicada.",
    "Creator World isn’t open enrollment. Apply to build your World.": "Creator World exige aprovação. Candidate-se para construir seu mundo.",
    "Your Creator World walkthrough.": "Guia do seu Creator World.",
    "How to go from application to Live": "Da candidatura à publicação",
    "Checking your account…": "Verificando sua conta…",
    "Checking your application…": "Verificando sua candidatura…"
  },
  "tl": {
    "Language": "Wika",
    "Choose site language": "Piliin ang wika ng site",
    "Home": "Home",
    "Creators": "Mga creator",
    "Access": "Access",
    "Apply": "Mag-apply",
    "Creator Login": "Login ng creator",
    "My ID": "Aking ID",
    "Dashboard": "Dashboard",
    "Operations": "Mga operasyon",
    "Music": "Musika",
    "Video": "Video",
    "Artwork": "Artwork",
    "Merch": "Merch",
    "World": "World",
    "Creator World update": "Update sa Creator World",
    "Watch": "Manood",
    "Story": "Kuwento",
    "The Show": "Ang palabas",
    "Highlights": "Mga highlight",
    "Credits": "Mga credit",
    "Build Mode": "Build mode",
    "Coach Tools": "Mga tool ng coach",
    "Overview": "Pangkalahatang-ideya",
    "Profile": "Profile",
    "＋ CREATE": "＋ GUMAWA",
    "CREATE": "GUMAWA",
    "My Creations": "Aking mga likha",
    "MY CREATIONS": "AKING MGA LIKHA",
    "Trust & Tools": "Tiwala at mga tool",
    "Inbox": "Inbox",
    "Display name": "Pangalan sa profile",
    "Headline": "Maikling pagpapakilala",
    "Location": "Lokasyon",
    "Categories": "Mga kategorya",
    "Biography": "Talambuhay",
    "Approved image path": "Path ng aprubadong larawan",
    "Save Profile": "I-save ang profile",
    "What are you creating?": "Ano ang gagawin mo?",
    "Title": "Pamagat",
    "Choose a file": "Pumili ng file",
    "Name this creation": "Pangalanan ang likha",
    "Open Preview": "Buksan ang preview",
    "Preview": "Preview",
    "Rename": "Palitan ang pangalan",
    "Send for Review": "Ipadala para sa review",
    "Make Private": "Gawing pribado",
    "＋ CREATE ANOTHER": "＋ GUMAWA ULIT",
    "Private": "Pribado",
    "In review": "Nirereview",
    "Changes needed": "Kailangan ng pagbabago",
    "Approved": "Aprubado",
    "Live": "Naka-publish",
    "All": "Lahat",
    "Show": "Ipakita",
    "Artists": "Mga artist",
    "Producers": "Mga producer",
    "Radio & DJ": "Radyo at DJ",
    "Athletes": "Mga atleta",
    "Coaches": "Mga coach",
    "The block": "Ang komunidad",
    "Fresh drops": "Mga bagong release",
    "World seals": "Mga World seal",
    "Build your world": "Buuin ang iyong World",
    "Build My Creator World": "Buuin ang aking Creator World",
    "Apply now →": "Mag-apply ngayon →",
    "Enter creator world →": "Pumasok sa World ng creator →",
    "Meet the creators ↓": "Kilalanin ang mga creator ↓",
    "Run my world ↗": "Pamahalaan ang aking World ↗",
    "Search creators": "Maghanap ng creator",
    "Search name, role, or city…": "Hanapin ang pangalan, papel, o lungsod…",
    "No creator found.": "Walang nahanap na creator.",
    "Try a different name, role, or location.": "Subukan ang ibang pangalan, papel, o lokasyon.",
    "Request Review": "Humiling ng review",
    "Badge level": "Antas ng badge",
    "Identity Check": "Pag-verify ng pagkakakilanlan",
    "Professional": "Propesyonal",
    "Partner": "Partner",
    "Organization": "Organisasyon",
    "Unverified": "Hindi pa verified",
    "View access →": "Tingnan ang access →",
    "Nothing created here yet.": "Wala pang nalikha rito.",
    "No submissions yet.": "Wala pang submission.",
    "Private • Creator access only • 50 MB max": "Pribado • Para sa creator lamang • 50 MB max",
    "Choose a type, add your file, and name it. Your creation stays private until approved and published.": "Pumili ng uri, idagdag ang file, at pangalanan ito. Pribado ito hanggang maaprubahan at ma-publish.",
    "Creator World isn’t open enrollment. Apply to build your World.": "Kailangan ng aplikasyon sa Creator World. Mag-apply para buuin ang iyong World.",
    "Your Creator World walkthrough.": "Gabay sa iyong Creator World.",
    "How to go from application to Live": "Mula aplikasyon hanggang pag-publish",
    "Checking your account…": "Sinusuri ang account…",
    "Checking your application…": "Sinusuri ang aplikasyon…"
  },
  "ko": {
    "Language": "언어",
    "Choose site language": "사이트 언어 선택",
    "Home": "홈",
    "Creators": "크리에이터",
    "Access": "접근 권한",
    "Apply": "신청",
    "Creator Login": "크리에이터 로그인",
    "My ID": "내 ID",
    "Dashboard": "대시보드",
    "Operations": "운영",
    "Music": "음악",
    "Video": "동영상",
    "Artwork": "아트워크",
    "Merch": "굿즈",
    "World": "월드",
    "Creator World update": "Creator World 업데이트",
    "Watch": "시청",
    "Story": "이야기",
    "The Show": "프로그램",
    "Highlights": "하이라이트",
    "Credits": "크레딧",
    "Build Mode": "빌드 모드",
    "Coach Tools": "코치 도구",
    "Overview": "개요",
    "Profile": "프로필",
    "＋ CREATE": "＋ 만들기",
    "CREATE": "만들기",
    "My Creations": "내 창작물",
    "MY CREATIONS": "내 창작물",
    "Trust & Tools": "신뢰 및 도구",
    "Inbox": "받은 편지함",
    "Display name": "표시 이름",
    "Headline": "소개 문구",
    "Location": "위치",
    "Categories": "카테고리",
    "Biography": "자기소개",
    "Approved image path": "승인된 이미지 경로",
    "Save Profile": "프로필 저장",
    "What are you creating?": "무엇을 만드나요?",
    "Title": "제목",
    "Choose a file": "파일 선택",
    "Name this creation": "창작물 이름 입력",
    "Open Preview": "미리보기 열기",
    "Preview": "미리보기",
    "Rename": "이름 변경",
    "Send for Review": "검토 요청",
    "Make Private": "비공개로 변경",
    "＋ CREATE ANOTHER": "＋ 다른 작품 만들기",
    "Private": "비공개",
    "In review": "검토 중",
    "Changes needed": "수정 필요",
    "Approved": "승인됨",
    "Live": "게시됨",
    "All": "전체",
    "Show": "표시",
    "Artists": "아티스트",
    "Producers": "프로듀서",
    "Radio & DJ": "라디오 및 DJ",
    "Athletes": "선수",
    "Coaches": "코치",
    "The block": "우리 동네",
    "Fresh drops": "새로운 작품",
    "World seals": "월드 인증",
    "Build your world": "나만의 월드 만들기",
    "Build My Creator World": "내 Creator World 만들기",
    "Apply now →": "지금 신청 →",
    "Enter creator world →": "크리에이터 월드 입장 →",
    "Meet the creators ↓": "크리에이터 만나기 ↓",
    "Run my world ↗": "내 월드 관리 ↗",
    "Search creators": "크리에이터 검색",
    "Search name, role, or city…": "이름, 역할 또는 도시 검색…",
    "No creator found.": "크리에이터를 찾을 수 없습니다.",
    "Try a different name, role, or location.": "다른 이름, 역할 또는 위치를 검색하세요.",
    "Request Review": "검토 요청",
    "Badge level": "배지 등급",
    "Identity Check": "신원 확인",
    "Professional": "전문가",
    "Partner": "파트너",
    "Organization": "단체",
    "Unverified": "미인증",
    "View access →": "접근 권한 보기 →",
    "Nothing created here yet.": "아직 창작물이 없습니다.",
    "No submissions yet.": "아직 제출된 항목이 없습니다.",
    "Private • Creator access only • 50 MB max": "비공개 • 크리에이터만 접근 • 최대 50 MB",
    "Choose a type, add your file, and name it. Your creation stays private until approved and published.": "유형을 선택하고 파일과 이름을 추가하세요. 승인 및 게시 전까지 비공개로 유지됩니다.",
    "Creator World isn’t open enrollment. Apply to build your World.": "Creator World는 신청과 승인이 필요합니다. 나만의 월드 만들기를 신청하세요.",
    "Your Creator World walkthrough.": "Creator World 안내",
    "How to go from application to Live": "신청부터 게시까지",
    "Checking your account…": "계정 확인 중…",
    "Checking your application…": "신청 확인 중…"
  },
  "ja": {
    "Language": "言語",
    "Choose site language": "サイトの言語を選択",
    "Home": "ホーム",
    "Creators": "クリエイター",
    "Access": "アクセス",
    "Apply": "応募",
    "Creator Login": "クリエイターログイン",
    "My ID": "マイID",
    "Dashboard": "ダッシュボード",
    "Operations": "運営",
    "Music": "音楽",
    "Video": "動画",
    "Artwork": "アートワーク",
    "Merch": "グッズ",
    "World": "ワールド",
    "Creator World update": "Creator Worldの更新",
    "Watch": "見る",
    "Story": "ストーリー",
    "The Show": "番組",
    "Highlights": "ハイライト",
    "Credits": "クレジット",
    "Build Mode": "ビルドモード",
    "Coach Tools": "コーチツール",
    "Overview": "概要",
    "Profile": "プロフィール",
    "＋ CREATE": "＋ 作成",
    "CREATE": "作成",
    "My Creations": "自分の作品",
    "MY CREATIONS": "自分の作品",
    "Trust & Tools": "信頼とツール",
    "Inbox": "受信トレイ",
    "Display name": "表示名",
    "Headline": "短い紹介文",
    "Location": "所在地",
    "Categories": "カテゴリー",
    "Biography": "自己紹介",
    "Approved image path": "承認済み画像のパス",
    "Save Profile": "プロフィールを保存",
    "What are you creating?": "何を作成しますか？",
    "Title": "タイトル",
    "Choose a file": "ファイルを選択",
    "Name this creation": "作品名を入力",
    "Open Preview": "プレビューを開く",
    "Preview": "プレビュー",
    "Rename": "名前を変更",
    "Send for Review": "審査に送信",
    "Make Private": "非公開にする",
    "＋ CREATE ANOTHER": "＋ 別の作品を作成",
    "Private": "非公開",
    "In review": "審査中",
    "Changes needed": "修正が必要",
    "Approved": "承認済み",
    "Live": "公開中",
    "All": "すべて",
    "Show": "表示",
    "Artists": "アーティスト",
    "Producers": "プロデューサー",
    "Radio & DJ": "ラジオとDJ",
    "Athletes": "アスリート",
    "Coaches": "コーチ",
    "The block": "コミュニティ",
    "Fresh drops": "新着作品",
    "World seals": "ワールド認証",
    "Build your world": "自分のワールドを作る",
    "Build My Creator World": "自分のCreator Worldを作成",
    "Apply now →": "今すぐ応募 →",
    "Enter creator world →": "クリエイターのワールドへ →",
    "Meet the creators ↓": "クリエイターを知る ↓",
    "Run my world ↗": "自分のワールドを管理 ↗",
    "Search creators": "クリエイターを検索",
    "Search name, role, or city…": "名前、役割、都市で検索…",
    "No creator found.": "クリエイターが見つかりません。",
    "Try a different name, role, or location.": "別の名前、役割、所在地で検索してください。",
    "Request Review": "審査を依頼",
    "Badge level": "バッジレベル",
    "Identity Check": "本人確認",
    "Professional": "プロフェッショナル",
    "Partner": "パートナー",
    "Organization": "組織",
    "Unverified": "未認証",
    "View access →": "アクセスを確認 →",
    "Nothing created here yet.": "まだ作品がありません。",
    "No submissions yet.": "まだ投稿がありません。",
    "Private • Creator access only • 50 MB max": "非公開 • クリエイターのみ • 最大50 MB",
    "Choose a type, add your file, and name it. Your creation stays private until approved and published.": "種類を選択し、ファイルと名前を追加します。承認と公開まで作品は非公開です。",
    "Creator World isn’t open enrollment. Apply to build your World.": "Creator Worldの利用には応募が必要です。自分のワールド作成に応募してください。",
    "Your Creator World walkthrough.": "Creator Worldガイド",
    "How to go from application to Live": "応募から公開まで",
    "Checking your account…": "アカウントを確認中…",
    "Checking your application…": "応募を確認中…"
  },
  "zh": {
    "Language": "语言",
    "Choose site language": "选择网站语言",
    "Home": "首页",
    "Creators": "创作者",
    "Access": "访问权限",
    "Apply": "申请",
    "Creator Login": "创作者登录",
    "My ID": "我的ID",
    "Dashboard": "控制面板",
    "Operations": "运营",
    "Music": "音乐",
    "Video": "视频",
    "Artwork": "艺术作品",
    "Merch": "周边商品",
    "World": "世界",
    "Creator World update": "Creator World更新",
    "Watch": "观看",
    "Story": "故事",
    "The Show": "节目",
    "Highlights": "精彩片段",
    "Credits": "制作名单",
    "Build Mode": "构建模式",
    "Coach Tools": "教练工具",
    "Overview": "概览",
    "Profile": "个人资料",
    "＋ CREATE": "＋ 创建",
    "CREATE": "创建",
    "My Creations": "我的作品",
    "MY CREATIONS": "我的作品",
    "Trust & Tools": "信任与工具",
    "Inbox": "收件箱",
    "Display name": "显示名称",
    "Headline": "简介标题",
    "Location": "所在地",
    "Categories": "类别",
    "Biography": "个人简介",
    "Approved image path": "已批准图片路径",
    "Save Profile": "保存资料",
    "What are you creating?": "你要创建什么？",
    "Title": "标题",
    "Choose a file": "选择文件",
    "Name this creation": "为作品命名",
    "Open Preview": "打开预览",
    "Preview": "预览",
    "Rename": "重命名",
    "Send for Review": "提交审核",
    "Make Private": "设为私密",
    "＋ CREATE ANOTHER": "＋ 创建另一个",
    "Private": "私密",
    "In review": "审核中",
    "Changes needed": "需要修改",
    "Approved": "已批准",
    "Live": "已发布",
    "All": "全部",
    "Show": "显示",
    "Artists": "艺人",
    "Producers": "制作人",
    "Radio & DJ": "电台与DJ",
    "Athletes": "运动员",
    "Coaches": "教练",
    "The block": "街区",
    "Fresh drops": "最新作品",
    "World seals": "世界认证",
    "Build your world": "构建你的世界",
    "Build My Creator World": "创建我的Creator World",
    "Apply now →": "立即申请 →",
    "Enter creator world →": "进入创作者世界 →",
    "Meet the creators ↓": "认识创作者 ↓",
    "Run my world ↗": "管理我的世界 ↗",
    "Search creators": "搜索创作者",
    "Search name, role, or city…": "搜索姓名、角色或城市…",
    "No creator found.": "未找到创作者。",
    "Try a different name, role, or location.": "请尝试其他姓名、角色或地点。",
    "Request Review": "请求审核",
    "Badge level": "徽章等级",
    "Identity Check": "身份验证",
    "Professional": "专业人士",
    "Partner": "合作伙伴",
    "Organization": "组织",
    "Unverified": "未认证",
    "View access →": "查看权限 →",
    "Nothing created here yet.": "还没有作品。",
    "No submissions yet.": "还没有提交内容。",
    "Private • Creator access only • 50 MB max": "私密 • 仅创作者可访问 • 最大50 MB",
    "Choose a type, add your file, and name it. Your creation stays private until approved and published.": "选择类型，添加文件并命名。作品在获得批准并发布前保持私密。",
    "Creator World isn’t open enrollment. Apply to build your World.": "Creator World需要申请。申请构建你的世界。",
    "Your Creator World walkthrough.": "Creator World使用指南",
    "How to go from application to Live": "从申请到发布",
    "Checking your account…": "正在检查账户…",
    "Checking your application…": "正在检查申请…"
  }
};
  Object.keys(dictionaries).forEach(function (language) {
    Object.keys(dictionaries[language]).forEach(function (source) {
      var uppercase = source.toUpperCase();
      if (!dictionaries[language][uppercase]) dictionaries[language][uppercase] = dictionaries[language][source].toUpperCase();
    });
  });
  var active, picker, observer, scheduled = false;
  var originalPageLanguage = document.documentElement.lang;
  var textState = new WeakMap();
  var attributeState = new WeakMap();
  var pendingRoots = new Set();
  // Translate only explicit editorial copy and known interface surfaces. Database-backed
  // names, biographies, titles, notes, and inbox/audit records never enter this lookup.
  var interfaceSelector = 'header nav, .hw-creator-language, button, label, .dashboard-tabs, .world-tabs, .filters, .creator-guide, .upload-note, .library-stats, .library-subcopy, .upload-panel > .panel-copy, .house-actions, .join, #emptyState, #verificationState, .creation-status-badge, .creation-kind-badge, .creator-card a, .world-publication-open, .world-publication-document, .discovery-creation-copy > a, .state-actions, .drop-actions, #dropMedia .document-drop a';
  var excluded = 'script,style,textarea,[contenteditable],[data-no-translate],#creatorLanguage option,.creator-card h3,.creation-card h4,.create-recent-summary strong,.discovery-creation-copy h3,.world-publication-copy h3,#profileTitle,#connectedCreatorName,#submissionList,#startCopy,.creation-note,#dropTitle,#nextDropTitle,#creatorName,#creatorHeadline,audio,video,iframe';
  var optionSelects = ['createKind', 'creationFilter', 'requestedLevel', 'submissionType', 'entitlementKey', 'entitlementStatus', 'entitlementSource'];
  var attributeSelector = 'input[placeholder],textarea[placeholder],button[aria-label],#creatorLanguage,#creatorSearch';

  function read(storageKey) {
    try { return localStorage.getItem(storageKey) || ''; } catch (error) { return ''; }
  }
  function initialLanguage() {
    var saved = read(key);
    if (labels[saved]) return saved;
    var legacy = read(legacyKey);
    if (labels[legacy]) {
      try { localStorage.setItem(key, legacy); } catch (error) {}
      return legacy;
    }
    if (originalPageLanguage === 'es') return 'es';
    var browser = String(navigator.language || 'en').toLowerCase();
    var code = browser.indexOf('fil') === 0 ? 'tl' : browser.split('-')[0];
    return labels[code] ? code : 'en';
  }
  function translated(source) {
    var dictionary = dictionaries[active] || {};
    if (dictionary[source]) return dictionary[source];
    // Badge/status values arrive from the service in lowercase.
    var titleCase = source.charAt(0).toUpperCase() + source.slice(1);
    return dictionary[titleCase] || dictionary[source.toUpperCase()] || source;
  }
  function original(state, current) {
    return state && current === state.rendered ? state.source : current;
  }
  function matchesIn(root, selector) {
    var nodes = Array.from(root.querySelectorAll(selector));
    if (root.matches && root.matches(selector)) nodes.unshift(root);
    return nodes;
  }
  function isInterface(node) {
    if (!node || node.closest(excluded)) return false;
    var option = node.closest('option');
    if (option) return !!option.parentElement && optionSelects.indexOf(option.parentElement.id) !== -1;
    return !!node.closest(interfaceSelector + ',[data-en][data-es]');
  }
  function translateRoot(root) {
    if (!root || !root.isConnected || root.closest(excluded)) return;
    matchesIn(root, '[data-en][data-es]').forEach(function (node) {
      if (node.children.length || node.closest(excluded)) return;
      var source = node.getAttribute('data-en');
      var rendered = active === 'es' ? node.getAttribute('data-es') : translated(source);
      if (node.textContent !== rendered) node.textContent = rendered;
    });
    matchesIn(root, '[data-en-label][data-es-label]').forEach(function (node) {
      if (node.closest(excluded)) return;
      var source = node.getAttribute('data-en-label');
      var rendered = active === 'es' ? node.getAttribute('data-es-label') : translated(source);
      if (node.getAttribute('aria-label') !== rendered) node.setAttribute('aria-label', rendered);
    });
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var text;
    while ((text = walker.nextNode())) {
      var parent = text.parentElement;
      if (!isInterface(parent) || parent.closest('[data-en][data-es]')) continue;
      var source = original(textState.get(text), text.nodeValue);
      var trimmed = source.trim().replace(/\s+/g, ' ');
      if (!trimmed) continue;
      var rendered = translated(trimmed);
      if (rendered === trimmed) rendered = source;
      else rendered = source.replace(/\S[\s\S]*\S|\S/, function () { return rendered; });
      if (text.nodeValue !== rendered) text.nodeValue = rendered;
      textState.set(text, { source: source, rendered: rendered });
    }
    matchesIn(root, attributeSelector).forEach(function (node) {
      if (node.closest('[data-no-translate]')) return;
      var states = attributeState.get(node) || {};
      ['placeholder', 'aria-label'].forEach(function (attr) {
        if (!node.hasAttribute(attr) || (attr === 'aria-label' && node.hasAttribute('data-en-label'))) return;
        var current = node.getAttribute(attr);
        var source = original(states[attr], current);
        var rendered = translated(source);
        if (current !== rendered) node.setAttribute(attr, rendered);
        states[attr] = { source: source, rendered: rendered };
      });
      attributeState.set(node, states);
    });
  }
  function observe() {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function setLanguage(language, save) {
    active = labels[language] ? language : 'en';
    if (save) {
      try { localStorage.setItem(key, active); localStorage.setItem(legacyKey, active); } catch (error) {}
    }
    observer.disconnect();
    pendingRoots.clear();
    document.documentElement.lang = active;
    picker.value = active;
    translateRoot(document.body);
    observe();
  }
  function queueRoot(node) {
    var root = node.nodeType === 1 ? node : node.parentElement;
    if (!root || !root.isConnected || root.closest(excluded)) return;
    // Ignore player timers and authored copy; only changed interface subtrees are visited.
    if (!isInterface(root) && !root.querySelector(interfaceSelector + ',[data-en][data-es],' + attributeSelector)) return;
    pendingRoots.add(root);
  }
  function boot() {
    picker = document.getElementById('creatorLanguage');
    if (!picker) return;
    observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'characterData') queueRoot(record.target);
        else record.addedNodes.forEach(queueRoot);
      });
      if (scheduled || !pendingRoots.size) return;
      scheduled = true;
      Promise.resolve().then(function () {
        scheduled = false;
        observer.disconnect();
        var roots = Array.from(pendingRoots);
        pendingRoots.clear();
        roots.filter(function (root) {
          return !roots.some(function (other) { return root !== other && other.contains(root); });
        }).forEach(translateRoot);
        observe();
      });
    });
    picker.addEventListener('change', function () { setLanguage(picker.value, true); });
    window.addEventListener('storage', function (event) {
      if (event.key === key) setLanguage(labels[event.newValue] ? event.newValue : 'en', false);
    });
    window.addEventListener('pageshow', function () { setLanguage(initialLanguage(), false); });
    setLanguage(initialLanguage(), false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
