// deno-lint-ignore-file jsx-button-has-type

/// <reference types="chrome" />

import { WcAccount } from "@/libs/account/mod.ts";
import { Channel } from "@/libs/channel/mod.ts";
import { useCopy } from "@/libs/copy/mod.ts";
import { Errors } from "@/libs/errors/mod.ts";
import { Outline } from "@/libs/heroicons/mod.ts";
import { Lang } from "@/libs/lang/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { useTask } from "@/libs/task/mod.ts";
import { ColorAnchor, ColorBubble } from "@/mods/app/color/mod.tsx";
import { SubpathProvider, useHashSubpath, useLinkWithCoords, usePath, usePathContext } from "@hazae41/chemin";
import { RpcMessageInit } from "@hazae41/jsonrpc";
import { Clicker, WideContrastButton, WideOppositeButton } from "@hazae41/labase";
import { PathBubble, PathPrompt, PathWindow } from "@hazae41/modal";
import { useCloseContext } from "@hazae41/react-close-context";
import { QrEncoder } from "@hazae41/visage";
import React, { Fragment, useCallback, useDeferredValue, useEffect, useState } from "react";

React;

export function ConnectPrompt(props: { channel: Channel } & { title: string } & { color: Nullable<string> } & { close(): void }) {
  const { channel, title, color, close: close1 } = props

  const close0 = useCloseContext().getOrThrow()

  const closeAndClose = useCallback(() => {
    setTimeout(() => close0(), 0)
    setTimeout(() => close1(), 500)
  }, [close0, close1])

  const [code, setCode] = useState<string>()
  const [blob, setBlob] = useState<string>()

  useEffect(() => {
    channel.request<void>({ method: "wc_propose", params: [title, color] }).then(() => closeAndClose()).catch(console.error)
    return () => void channel.request<void>({ method: "wc_abandon" }).catch(console.error)
  }, [])

  const onMessage = useCallback((event: CustomEvent<RpcMessageInit>) => {
    const message = event.detail

    if ("method" in message === false)
      return

    const { method, params } = message

    if (method === "wc_pairingChanged") {
      const [code] = params as [string]

      setCode(code)

      const source = new TextEncoder().encode(code)
      const matrix = new QrEncoder("byte").encode(source)

      const image = new OffscreenCanvas(matrix.width, matrix.width)
      const pixel = new ImageData(matrix.width, matrix.width)

      for (let i = 0; i < matrix.array.length; i++) {
        pixel.data[i * 4 + 0] = matrix.array[i] % 2 ? 255 : 0
        pixel.data[i * 4 + 1] = matrix.array[i] % 2 ? 255 : 0
        pixel.data[i * 4 + 2] = matrix.array[i] % 2 ? 255 : 0
        pixel.data[i * 4 + 3] = 255
      }

      image.getContext("2d")!.putImageData(pixel, 0, 0)

      const canvas = new OffscreenCanvas(300, 300)

      const context = canvas.getContext("2d")!
      context.imageSmoothingEnabled = false
      context.drawImage(image, 0, 0, matrix.width, matrix.width, 0, 0, canvas.width, canvas.width)

      canvas.convertToBlob({ type: "image/png" }).then((blob) => setBlob(URL.createObjectURL(blob!)))

      return
    }

    return
  }, [])

  useEffect(() => {
    channel.addEventListener("message", onMessage, { passive: true })
    return () => channel.removeEventListener("message", onMessage)
  }, [channel, onMessage])

  useEffect(() => () => {
    if (blob == null)
      return
    else
      URL.revokeObjectURL(blob)
  }, [blob])

  const copy = useCopy(code)

  return <div className="flex flex-col grow p-6 text-base">
    <div className="font-medium">
      {Lang.match({ en: "WalletConnect code", zh: "WalletConnect 代码", hi: "WalletConnect कोड", es: "Código de WalletConnect", ar: "رمز WalletConnect", fr: "Code WalletConnect", de: "WalletConnect-Code", ru: "Код WalletConnect", pt: "Código WalletConnect", ja: "WalletConnectコード", pa: "WalletConnect ਕੋਡ", bn: "WalletConnect কোড", id: "Kode WalletConnect", ur: "WalletConnect کوڈ", ms: "Kod WalletConnect", it: "Codice WalletConnect", tr: "WalletConnect kodu", ta: "WalletConnect குறியீடு", te: "WalletConnect కోడ్", ko: "WalletConnect 코드", vi: "Mã WalletConnect", pl: "Kod WalletConnect", ro: "Cod WalletConnect", nl: "WalletConnect-code", el: "Κωδικός WalletConnect", th: "รหัส WalletConnect", cs: "Kód WalletConnect", hu: "WalletConnect kód", sv: "WalletConnect-kod", da: "WalletConnect-kode", })}
    </div>
    <div className="h-1" />
    <div className="text-default-contrast">
      {Lang.match({ en: "Your WalletConnect pairing code. Use it to connect your wallet.", zh: "您的 WalletConnect 配对代码。用它连接您的钱包。", hi: "आपका WalletConnect पेयरिंग कोड। इसका उपयोग अपने वॉलेट को कनेक्ट करने के लिए करें।", es: "Su código de emparejamiento de WalletConnect. Úselo para conectar su billetera.", ar: "رمز اقتران WalletConnect الخاص بك. استخدمه لتوصيل محفظتك.", fr: "Votre code de jumelage WalletConnect. Utilisez-le pour connecter votre portefeuille.", de: "Ihr WalletConnect-Pairing-Code. Verwenden Sie ihn, um Ihre Brieftasche zu verbinden.", ru: "Ваш код сопряжения WalletConnect. Используйте его для подключения вашего кошелька.", pt: "Seu código de emparelhamento WalletConnect. Use-o para conectar sua carteira.", ja: "あなたの WalletConnect ペアリングコード。ウォレットを接続するために使用してください。", pa: "ਤੁਹਾਡਾ WalletConnect ਪੇਅਰਿੰਗ ਕੋਡ। ਇਸਨੂੰ ਆਪਣੇ ਵਾਲਿਟ ਨੂੰ ਕਨੈਕਟ ਕਰਨ ਲਈ ਵਰਤੋਂ ਕਰੋ।", bn: "আপনার WalletConnect পেয়ারিং কোড। এটি ব্যবহার করে আপনার ওয়ালেট সংযুক্ত করুন।", id: "Kode pasangan WalletConnect Anda. Gunakan untuk menghubungkan dompet Anda.", ur: "آپ کا WalletConnect پیئرنگ کوڈ۔ اسے اپنے والیٹ کو جوڑنے کے لیے استعمال کریں۔", ms: "Kod pasangan WalletConnect anda. Gunakannya untuk menyambungkan dompet anda.", it: "Il tuo codice di associazione WalletConnect. Usalo per connettere il tuo portafoglio.", tr: "WalletConnect eşleştirme kodunuz. Cüzdanınızı bağlamak için kullanın.", ta: "உங்கள் WalletConnect ஜோடி குறியீடு. உங்கள் பணப்பையை இணைக்க இதைப் பயன்படுத்தவும்.", te: "మీ WalletConnect జత కోడ్. మీ వాలెట్‌ను కనెక్ట్ చేయడానికి దీన్ని ఉపయోగించండి.", ko: "귀하의 WalletConnect 페어링 코드. 지갑을 연결하는 데 사용하세요.", vi: "Mã ghép nối WalletConnect của bạn. Sử dụng nó để kết nối ví của bạn.", pl: "Twój kod parowania WalletConnect. Użyj go, aby połączyć swój portfel.", ro: "Codul dvs. de asociere WalletConnect. Folosiți-l pentru a vă conecta portofelul.", nl: "Uw WalletConnect-koppelingscode. Gebruik deze om uw portemonnee te verbinden.", el: "Ο κωδικός ζεύξης WalletConnect σας. Χρησιμοποιήστε τον για να συνδέσετε το πορτοφόλι σας.", th: "รหัสจับคู่ WalletConnect ของคุณ ใช้เพื่อเชื่อมต่อกระเป๋าเงินของคุณ", cs: "Váš kód párování WalletConnect. Použijte jej k připojení své peněženky.", hu: "A WalletConnect párosítási kódja. Használja a pénztárca csatlakoztatásához.", sv: "Din WalletConnect-parningskod. Använd den för att ansluta din plånbok.", da: "Din WalletConnect-parringskode. Brug den til at forbinde din tegnebog." })}
    </div>
    <div className="h-4" />
    <div className="bg-default-contrast po-2 rounded-xl flex items-center gap-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-default-contrast">
      <input className="w-full focus-visible:outline-none"
        readOnly
        autoComplete="off"
        onFocus={e => e.currentTarget.select()}
        value={code} />
      <div className="flex items-center gap-2">
        <button className="group rounded-full p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
          onClick={copy}>
          <Clicker>
            {copy.copying ? <Outline.CheckIcon className="size-5" /> : <Outline.DocumentDuplicateIcon className="size-5" />}
          </Clicker>
        </button>
        <a className="group rounded-full p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
          href={blob}
          target="_blank"
          rel="noreferrer">
          <Clicker>
            <Outline.QrCodeIcon className="size-5" />
          </Clicker>
        </a>
      </div>
    </div>
  </div>
}

export function CreateWindow(props: { channel: Channel }) {
  const { channel } = props

  const close = useCloseContext().getOrThrow()

  const path = usePathContext().getOrThrow()
  const hash = useHashSubpath(path)

  const [$title, setTitle] = useState("")

  const title = useDeferredValue($title || "Main")

  const [color, setColor] = useState<Nullable<string>>(["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"][Math.floor(Math.random() * 16)])

  const goto = {
    color: useLinkWithCoords(hash, "/color"),
    connect: useLinkWithCoords(hash, "/connect")
  }

  return <div className="flex flex-col grow p-6 text-base">
    <SubpathProvider value={hash}>
      {hash.url.pathname === goto.color.rel.pathname &&
        <PathBubble>
          <ColorBubble ok={setColor} />
        </PathBubble>}
      {hash.url.pathname === goto.connect.rel.pathname &&
        <PathPrompt>
          <ConnectPrompt
            channel={channel}
            title={title}
            color={color}
            close={close} />
        </PathPrompt>}
    </SubpathProvider>
    <h1 className="text-xl font-medium">
      {Lang.match({ en: "Add account", zh: "添加账户", hi: "खाता जोड़ें", es: "Agregar cuenta", ar: "إضافة حساب", fr: "Ajouter un compte", de: "Konto hinzufügen", ru: "Добавить аккаунт", pt: "Adicionar conta", ja: "アカウントを追加", pa: "ਖਾਤਾ ਸ਼ਾਮਲ ਕਰੋ", bn: "অ্যাকাউন্ট যোগ করুন", id: "Tambahkan akun", ur: "اکاؤنٹ شامل کریں", ms: "Tambah akaun", it: "Aggiungi account", tr: "Hesap ekle", ta: "கணக்கைச் சேர்க்கவும்", te: "ఖాతాను జోడించండి", ko: "계정 추가", vi: "Thêm tài khoản", pl: "Dodaj konto", ro: "Adăugați cont", nl: "Account toevoegen", el: "Προσθήκη λογαριασμού", th: "เพิ่มบัญชี", cs: "Přidat účet", hu: "Fiók hozzáadása", sv: "Lägg till konto", da: "Tilføj konto" })}
    </h1>
    <div className="h-6" />
    <div className="flex items-center justify-center">
      <div className="w-[18rem] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start
      data-[color=red]:bg-red-400 
      data-[color=orange]:bg-orange-400 
      data-[color=amber]:bg-amber-400 
      data-[color=yellow]:bg-yellow-400 
      data-[color=lime]:bg-lime-400 
      data-[color=green]:bg-green-400 
      data-[color=emerald]:bg-emerald-400 
      data-[color=teal]:bg-teal-400 
      data-[color=cyan]:bg-cyan-400 
      data-[color=sky]:bg-sky-400 
      data-[color=blue]:bg-blue-400 
      data-[color=indigo]:bg-indigo-400 
      data-[color=violet]:bg-violet-400 
      data-[color=purple]:bg-purple-400 
      data-[color=fuchsia]:bg-fuchsia-400 
      data-[color=pink]:bg-pink-400 
      data-[color=rose]:bg-rose-400 
      in-dark:data-[color=red]:bg-red-500
      in-dark:data-[color=orange]:bg-orange-500
      in-dark:data-[color=amber]:bg-amber-500
      in-dark:data-[color=yellow]:bg-yellow-500
      in-dark:data-[color=lime]:bg-lime-500
      in-dark:data-[color=green]:bg-green-500
      in-dark:data-[color=emerald]:bg-emerald-500
      in-dark:data-[color=teal]:bg-teal-500
      in-dark:data-[color=cyan]:bg-cyan-500
      in-dark:data-[color=sky]:bg-sky-500
      in-dark:data-[color=blue]:bg-blue-500
      in-dark:data-[color=indigo]:bg-indigo-500
      in-dark:data-[color=violet]:bg-violet-500
      in-dark:data-[color=purple]:bg-purple-500
      in-dark:data-[color=fuchsia]:bg-fuchsia-500
      in-dark:data-[color=pink]:bg-pink-500
      in-dark:data-[color=rose]:bg-rose-500"
        data-theme={color == null ? "opposite" : "dark"}
        data-color={color}>
        <div className="font-medium text-lg">
          {title}
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-xl po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </div>
    </div>
    <div className="h-6" />
    <form className="grow flex flex-col">
      <div className="font-medium">
        {Lang.match({ en: "Title", zh: "标题", hi: "शीर्षक", es: "Título", ar: "العنوان", fr: "Titre", de: "Titel", ru: "Заголовок", pt: "Título", ja: "タイトル", pa: "ਸਿਰਲੇਖ", bn: "শিরোনাম", id: "Judul", ur: "عنوان", ms: "Tajuk", it: "Titolo", tr: "Başlık", ta: "தலைப்பு", te: "శీర్షిక", ko: "제목", vi: "Tiêu đề", pl: "Tytuł", ro: "Titlu", nl: "Titel", el: "Τίτλος", th: "หัวข้อ", cs: "Název", hu: "Cím", sv: "Titel", da: "Titel" })}
      </div>
      <div className="h-1" />
      <div className="text-default-contrast">
        {Lang.match({ en: "Name this account. This name won't be shared anywhere.", zh: "为此账户命名。此名称不会在任何地方共享。", hi: "इस खाते का नाम दें। यह नाम कहीं भी साझा नहीं किया जाएगा।", es: "Nombra esta cuenta. Este nombre no se compartirá en ningún lugar.", ar: "قم بتسمية هذا الحساب. لن يتم مشاركة هذا الاسم في أي مكان.", fr: "Nommez ce compte. Ce nom ne sera partagé nulle part.", de: "Benennen Sie dieses Konto. Dieser Name wird nirgendwo geteilt.", ru: "Назовите этот аккаунт. Это имя нигде не будет использоваться.", pt: "Nomeie esta conta. Este nome não será compartilhado em nenhum lugar.", ja: "このアカウントに名前を付けます。この名前はどこにも共有されません。", pa: "ਇਸ ਖਾਤੇ ਦਾ ਨਾਮ ਰੱਖੋ। ਇਹ ਨਾਮ ਕਿਤੇ ਵੀ ਸਾਂਝਾ ਨਹੀਂ ਕੀਤਾ ਜਾਵੇਗਾ।", bn: "এই অ্যাকাউন্টের নাম দিন। এই নাম কোথাও শেয়ার করা হবে না।", id: "Beri nama akun ini. Nama ini tidak akan dibagikan di mana pun.", ur: "اس اکاؤنٹ کا نام رکھیں۔ یہ نام کہیں بھی شیئر نہیں کیا جائے گا۔", ms: "Namakan akaun ini. Nama ini tidak akan dikongsi di mana-mana.", it: "Assegna un nome a questo account. Questo nome non sarà condiviso da nessuna parte.", tr: "Bu hesabı adlandırın. Bu ad hiçbir yerde paylaşılmayacak.", ta: "இந்த கணக்கிற்கு பெயர் வைக்கவும். இந்த பெயர் எங்கும் பகிரப்படாது.", te: "ఈ ఖాతాకు పేరు పెట్టండి. ఈ పేరు ఎక్కడా పంచుకోబడదు.", ko: "이 계정의 이름을 지정하세요. 이 이름은 어디에도 공유되지 않습니다.", vi: "Đặt tên cho tài khoản này. Tên này sẽ không được chia sẻ ở bất kỳ đâu.", pl: "Nazwij to konto. Ta nazwa nie będzie udostępniana nigdzie.", ro: "Denumiți acest cont. Acest nume nu va fi partajat nicăieri.", nl: "Geef dit account een naam. Deze naam wordt nergens gedeeld.", el: "Ονομάστε αυτόν τον λογαριασμό. Αυτό το όνομα δεν θα κοινοποιηθεί πουθενά.", th: "ตั้งชื่อบัญชีนี้ ชื่อนี้จะไม่ถูกแชร์ที่ไหน", cs: "Pojmenujte tento účet. Tento název nebude nikde sdílen.", hu: "Nevezze el ezt a fiókot. Ez a név sehol sem lesz megosztva.", sv: "Namnge detta konto. Detta namn kommer inte att delas någonstans.", da: "Navngiv denne konto. Dette navn vil ikke blive delt nogen steder." })}
      </div>
      <div className="h-4" />
      <div className="bg-default-contrast po-2 rounded-xl flex items-center gap-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-default-contrast">
        <input className="w-full focus-visible:outline-none"
          autoFocus
          autoComplete="off"
          placeholder={title}
          onChange={e => setTitle(e.target.value)}
          value={$title} />
        <div className="flex items-center gap-2">
          <ColorAnchor color={color} link={goto.color} />
        </div>
      </div>
      <div className="h-8 grow" />
      <div className="flex items-center flex-wrap-reverse gap-2">
        <WideOppositeButton
          onClick={goto.connect.onClick}>
          {Lang.match({ en: "Connect", zh: "连接", hi: "कनेक्ट करें", es: "Conectar", ar: "اتصال", fr: "Connecter", de: "Verbinden", ru: "Подключить", pt: "Conectar", ja: "接続", pa: "ਜੁੜੋ", bn: "সংযোগ করুন", id: "Hubungkan", ur: "کنیکٹ کریں", ms: "Sambung", it: "Connetti", tr: "Bağlan", ta: "இணைக்கவும்", te: "కనెక్ట్ చేయండి", ko: "연결", vi: "Kết nối", pl: "Połącz", ro: "Conectează", nl: "Verbinden", el: "Σύνδεση", th: "เชื่อมต่อ", cs: "Připojit", hu: "Csatlakozás", sv: "Anslut", da: "Forbind" })}
        </WideOppositeButton>
      </div>
    </form>
  </div>
}

export function App(props: { channel: Channel }) {
  const { channel } = props

  const path = usePathContext().getOrThrow()
  const hash = useHashSubpath(path)

  const goto = {
    create: useLinkWithCoords(hash, "/create")
  }

  const [account, setAccount] = useState<WcAccount>()

  const onMessage = useCallback((event: CustomEvent<RpcMessageInit>) => {
    const message = event.detail

    if ("method" in message === false)
      return

    const { method, params } = message

    if (method === "wc_accountChanged") {
      const [account] = params as [WcAccount]

      setAccount(account)

      return
    }

    if (method === "wc_accountsChanged") {
      const accounts = params as WcAccount[]

      setAccounts(accounts)

      return
    }

    return
  }, [])

  useEffect(() => {
    channel.addEventListener("message", onMessage, { passive: true })
    return () => channel.removeEventListener("message", onMessage)
  }, [channel, onMessage])

  useEffect(() => {
    channel.request<WcAccount>({ method: "wc_account", params: [] }).then(setAccount)
  }, [channel])

  const onConnect = useTask((wanted: WcAccount) => Promise.try(async () => {
    await channel.request({ method: "wc_connect", params: [wanted] })
  }).catch(Errors.display), [channel, account])

  const onDisconnect = useTask(() => Promise.try(async () => {
    await channel.request({ method: "wc_disconnect", params: [] })
  }).catch(Errors.display), [channel])

  const [accounts, setAccounts] = useState<WcAccount[]>([])

  useEffect(() => {
    channel.request<WcAccount[]>({ method: "wc_accounts", params: [] }).then(setAccounts)
  }, [channel])

  return <div className="h-full w-full flex flex-col items-center p-8">
    <SubpathProvider value={hash}>
      {hash.url.pathname === goto.create.rel.pathname &&
        <PathWindow>
          <CreateWindow channel={channel} />
        </PathWindow>}
    </SubpathProvider>
    {!account && <Fragment>
      <div className="w-[18rem] aspect-video bg-default-contrast border-2 border-default-contrast rounded-xl flex items-center justify-center p-8 break-all overflow-y-auto" />
    </Fragment>}
    {account && <Fragment key={account.address.eip155}>
      <button className="w-[18rem] aspect-video bg-default text-default selection-default cursor-pointer border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start animate-opacity-in hover:scale-105 focus-visible:outline-none focus-visible:scale-105 transition-transform
      data-[color=red]:bg-red-400 
      data-[color=orange]:bg-orange-400 
      data-[color=amber]:bg-amber-400 
      data-[color=yellow]:bg-yellow-400 
      data-[color=lime]:bg-lime-400 
      data-[color=green]:bg-green-400 
      data-[color=emerald]:bg-emerald-400 
      data-[color=teal]:bg-teal-400 
      data-[color=cyan]:bg-cyan-400 
      data-[color=sky]:bg-sky-400 
      data-[color=blue]:bg-blue-400 
      data-[color=indigo]:bg-indigo-400 
      data-[color=violet]:bg-violet-400 
      data-[color=purple]:bg-purple-400 
      data-[color=fuchsia]:bg-fuchsia-400 
      data-[color=pink]:bg-pink-400 
      data-[color=rose]:bg-rose-400 
      in-dark:data-[color=red]:bg-red-500
      in-dark:data-[color=orange]:bg-orange-500
      in-dark:data-[color=amber]:bg-amber-500
      in-dark:data-[color=yellow]:bg-yellow-500
      in-dark:data-[color=lime]:bg-lime-500
      in-dark:data-[color=green]:bg-green-500
      in-dark:data-[color=emerald]:bg-emerald-500
      in-dark:data-[color=teal]:bg-teal-500
      in-dark:data-[color=cyan]:bg-cyan-500
      in-dark:data-[color=sky]:bg-sky-500
      in-dark:data-[color=blue]:bg-blue-500
      in-dark:data-[color=indigo]:bg-indigo-500
      in-dark:data-[color=violet]:bg-violet-500
      in-dark:data-[color=purple]:bg-purple-500
      in-dark:data-[color=fuchsia]:bg-fuchsia-500
      in-dark:data-[color=pink]:bg-pink-500
      in-dark:data-[color=rose]:bg-rose-500"
        data-theme={accounts.find(x => x.uuid === account.uuid)?.color == null ? "opposite" : "dark"}
        data-color={accounts.find(x => x.uuid === account.uuid)?.color}
        onClick={onDisconnect}>
        <div className="font-medium text-lg">
          {accounts.find(x => x.uuid === account.uuid)?.title}
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-xl po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </Fragment>}
    <div className="h-4 grow shrink-0" />
    <div className="mt-28 w-full flex flex-col items-center isolate">
      {accounts.map(x =>
        <Fragment key={x.uuid}>
          <AccountCard channel={channel} account={x} connect={onConnect} />
        </Fragment>)}
      <a className="-mt-28 z-0 w-[18rem] aspect-video bg-default border-2 border-default-contrast rounded-xl flex items-center justify-center hover:scale-105 focus-visible:outline-none focus-visible:scale-105 transition-transform"
        style={{ zIndex: accounts.length }}
        onKeyDown={goto.create.onKeyDown}
        onClick={goto.create.onClick}
        href={goto.create.abs.hash}>
        <Outline.PlusIcon className="size-8" />
      </a>
    </div>
  </div>
}

export function AccountCard(props: { channel: Channel } & { account: WcAccount } & { connect(account: WcAccount): void }) {
  const { channel, account, connect } = props

  const path = usePath()
  const hash = useHashSubpath(path)

  const goto = {
    delete: useLinkWithCoords(hash, `/${account.uuid}/delete`)
  }

  const onClick = useCallback(() => {
    connect(account)
  }, [connect, account])

  return <Fragment>
    <SubpathProvider value={hash}>
      {hash.url.pathname === goto.delete.rel.pathname &&
        <PathPrompt>
          <DeletePrompt
            channel={channel}
            account={account} />
        </PathPrompt>}
    </SubpathProvider>
    <button className="-mt-28 z-0 w-[18rem] aspect-video bg-default text-default selection-default cursor-pointer border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start hover:scale-105 focus-visible:outline-none focus-visible:scale-105 transition-transform
  data-[color=red]:bg-red-400 
  data-[color=orange]:bg-orange-400 
  data-[color=amber]:bg-amber-400 
  data-[color=yellow]:bg-yellow-400 
  data-[color=lime]:bg-lime-400 
  data-[color=green]:bg-green-400 
  data-[color=emerald]:bg-emerald-400 
  data-[color=teal]:bg-teal-400 
  data-[color=cyan]:bg-cyan-400 
  data-[color=sky]:bg-sky-400 
  data-[color=blue]:bg-blue-400 
  data-[color=indigo]:bg-indigo-400 
  data-[color=violet]:bg-violet-400 
  data-[color=purple]:bg-purple-400 
  data-[color=fuchsia]:bg-fuchsia-400 
  data-[color=pink]:bg-pink-400 
  data-[color=rose]:bg-rose-400 
  in-dark:data-[color=red]:bg-red-500
  in-dark:data-[color=orange]:bg-orange-500
  in-dark:data-[color=amber]:bg-amber-500
  in-dark:data-[color=yellow]:bg-yellow-500
  in-dark:data-[color=lime]:bg-lime-500
  in-dark:data-[color=green]:bg-green-500
  in-dark:data-[color=emerald]:bg-emerald-500
  in-dark:data-[color=teal]:bg-teal-500
  in-dark:data-[color=cyan]:bg-cyan-500
  in-dark:data-[color=sky]:bg-sky-500
  in-dark:data-[color=blue]:bg-blue-500
  in-dark:data-[color=indigo]:bg-indigo-500
  in-dark:data-[color=violet]:bg-violet-500
  in-dark:data-[color=purple]:bg-purple-500
  in-dark:data-[color=fuchsia]:bg-fuchsia-500
  in-dark:data-[color=pink]:bg-pink-500
  in-dark:data-[color=rose]:bg-rose-500"
      data-theme={account.color == null ? "opposite" : "dark"}
      data-color={account.color}
      onClick={onClick}>
      <div className="w-full flex items-center">
        <div className="font-medium text-lg">
          {account.title}
        </div>
        <div className="w-4 grow" />
        <div className="flex items-center gap-2"
          onClick={e => e.stopPropagation()}>
          <a className="group rounded-full cursor-pointer p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
            onKeyDown={goto.delete.onKeyDown}
            onClick={goto.delete.onClick}
            href={goto.delete.abs.hash}>
            <Clicker>
              <Outline.TrashIcon className="size-5" />
            </Clicker>
          </a>
        </div>
      </div>
    </button>
  </Fragment>
}

export function DeletePrompt(props: { channel: Channel } & { account: WcAccount }) {
  const { channel, account } = props

  const close = useCloseContext().getOrThrow()

  const onClose = useCallback(() => {
    close()
  }, [close])

  const onDelete = useTask(() => Promise.try(async () => {
    await channel.request({ method: "wc_delete", params: [account] })
  }).catch(Errors.display), [channel, account])

  return <div className="flex flex-col grow p-6 text-base">
    <div className="font-medium">
      {Lang.match({ en: "Delete", zh: "删除", hi: "हटाएं", es: "Eliminar", ar: "حذف", fr: "Supprimer", de: "Löschen", ru: "Удалить", pt: "Excluir", ja: "削除", pa: "ਹਟਾਓ", bn: "মুছুন", id: "Hapus", ur: "حذف کریں", ms: "Padam", it: "Elimina", tr: "Sil", ta: "அழிக்கவும்", te: "తొలగించు", ko: "삭제", vi: "Xóa", pl: "Usuń", ro: "Șterge", nl: "Verwijderen", el: "Διαγραφή", th: "ลบ", cs: "Smazat", hu: "Törlés", sv: "Radera", da: "Slet" })}
    </div>
    <div className="h-1" />
    <div className="text-default-contrast">
      {Lang.match({ en: "Are you sure you want to delete this account?", zh: "您确定要删除此账户吗？", hi: "क्या आप वाकई इस खाते को हटाना चाहते हैं?", es: "¿Está seguro de que desea eliminar esta cuenta?", ar: "هل أنت متأكد أنك تريد حذف هذا الحساب؟", fr: "Êtes-vous sûr de vouloir supprimer ce compte ?", de: "Sind Sie sicher, dass Sie dieses Konto löschen möchten?", ru: "Вы уверены, что хотите удалить этот аккаунт?", pt: "Tem certeza de que deseja excluir esta conta?", ja: "このアカウントを削除してもよろしいですか？", pa: "ਕੀ ਤੁਸੀਂ ਯਕੀਨਨ ਇਸ ਖਾਤੇ ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?", bn: "আপনি কি সত্যিই এই অ্যাকাউন্টটি মুছতে চান?", id: "Apakah Anda yakin ingin menghapus akun ini?", ur: "کیا آپ واقعی اس اکاؤنٹ کو حذف کرنا چاہتے ہیں؟", ms: "Adakah anda pasti mahu memadam akaun ini?", it: "Sei sicuro di voler eliminare questo account?", tr: "Bu hesabı silmek istediğinizden emin misiniz?", ta: "இந்த கணக்கை நீக்க விரும்புகிறீர்களா?", te: "మీరు నిజంగా ఈ ఖాతాను తొలగించాలనుకుంటున్నారా?", ko: "이 계정을 삭제하시겠습니까?", vi: "Bạn có chắc chắn muốn xóa tài khoản này không?", pl: "Czy na pewno chcesz usunąć to konto?", ro: "Sigur doriți să ștergeți acest cont?", nl: "Weet u zeker dat u dit account wilt verwijderen?", el: "Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτόν τον λογαριασμό;", th: "คุณแน่ใจหรือว่าต้องการลบบัญชีนี้?", cs: "Opravdu chcete tento účet smazat?", hu: "Biztosan törölni szeretné ezt a fiókot?", sv: "Är du säker på att du vill ta bort detta konto?", da: "Er du sikker på, at du vil slette denne konto?" })}
    </div>
    <div className="h-4" />
    <div className="flex items-center flex-wrap-reverse gap-2">
      <WideContrastButton
        onClick={onClose}>
        {Lang.match({ en: "Cancel", zh: "取消", hi: "रद्द करें", es: "Cancelar", ar: "إلغاء", fr: "Annuler", de: "Abbrechen", ru: "Отмена", pt: "Cancelar", ja: "キャンセル", pa: "ਰੱਦ ਕਰੋ", bn: "বাতিল করুন", id: "Batal", ur: "منسوخ کریں", ms: "Batal", it: "Annulla", tr: "İptal", ta: "ரத்து செய்", te: "రద్దు చేయి", ko: "취소", vi: "Hủy", pl: "Anuluj", ro: "Anulează", nl: "Annuleren", el: "Ακύρωση", th: "ยกเลิก", cs: "Zrušit", hu: "Mégse", sv: "Avbryt", da: "Annuller" })}
      </WideContrastButton>
      <WideOppositeButton
        onClick={onDelete}>
        {Lang.match({ en: "Delete", zh: "删除", hi: "हटाएं", es: "Eliminar", ar: "حذف", fr: "Supprimer", de: "Löschen", ru: "Удалить", pt: "Excluir", ja: "削除", pa: "ਹਟਾਓ", bn: "মুছুন", id: "Hapus", ur: "حذف کریں", ms: "Padam", it: "Elimina", tr: "Sil", ta: "அழிக்கவும்", te: "తొలగించు", ko: "삭제", vi: "Xóa", pl: "Usuń", ro: "Șterge", nl: "Verwijderen", el: "Διαγραφή", th: "ลบ", cs: "Smazat", hu: "Törlés", sv: "Radera", da: "Slet" })}
      </WideOppositeButton>
    </div>
  </div>
}