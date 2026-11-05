// deno-lint-ignore-file no-namespace

/// <reference types="chrome" />

import { chainlist } from "@/libs/chainlist/mod.ts";
import { Channel } from "@/libs/channel/mod.ts";
import { Lang } from "@/libs/lang/mod.ts";
import { RpcErr, RpcError, RpcInternalError, RpcInvalidRequestError, RpcMessageInit, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc";

declare global {

  export interface WindowEventMap {
    "pipe:request": CustomEvent<RpcRequestInit>
    "pipe:respond": CustomEvent<RpcResponseInit>
  }

}

declare global {

  export interface WindowEventMap {
    "pipe:requestSync": FormDataEvent
  }

}

declare global {

  export interface WindowEventMap {
    "pipe:message": CustomEvent<RpcRequestPreinit>
  }

}

let chainId = 1

namespace backend {

  export const channel = new Channel()

  export async function request<T>(request: RpcRequestPreinit) {
    const params = { chainId: `eip155:${chainId}`, request }
    return await channel.request<T>({ method: "wc_sessionRequest", params })
  }

  channel.addEventListener("message", (event: CustomEvent<RpcMessageInit>) => {
    const message = event.detail

    if ("method" in message === false)
      return

    const { method, params } = message

    frontend.message({ method, params })

    return
  })

}

namespace frontend {

  const permissions: Record<string, Record<string, unknown>> = {}

  export function message(message: RpcRequestPreinit) {
    const { method, params } = message

    const detail = { method, params }

    dispatchEvent(new CustomEvent("pipe:message", { detail }))
  }

  export function routeSync(request: RpcRequest) {
    const { method } = request

    if (method === "eip6963_uuid")
      return "e60d639a-8479-4a9b-a7d6-ac4bd3957b13"
    if (method === "eip6963_rdns")
      return "tech.brume.click"

    if (method === "chrome_name")
      return chrome.runtime.getManifest().name
    if (method === "chrome_version")
      return chrome.runtime.getManifest().version

    throw new RpcMethodNotFoundError()
  }

  export async function route(request: RpcRequest) {
    const { method, params } = request

    if (method === "eth_chainId") {
      const _ = params

      // NOOP

      return `0x${chainId.toString(16)}`
    }

    if (method === "eth_coinbase") {
      const _ = params

      if (permissions["eth_accounts"] == null)
        return null

      return await backend.request(request)
    }

    if (method === "eth_accounts") {
      const _ = params

      if (permissions["eth_accounts"] == null)
        return []

      return await backend.request(request)
    }

    if (method === "eth_requestAccounts") {
      const _ = params

      if (permissions["eth_accounts"] != null)
        return await backend.request(request)

      if (!confirm(Lang.match({ en: "I want to access your accounts", zh: "我想访问您的账户", hi: "मैं आपके खातों तक पहुंचना चाहता हूँ", es: "Quiero acceder a sus cuentas", ar: "أريد الوصول إلى حساباتك", fr: "Je veux accéder à vos comptes", de: "Ich möchte auf Ihre Konten zugreifen", ru: "Я хочу получить доступ к вашим аккаунтам", pt: "Quero acessar suas contas", ja: "あなたのアカウントにアクセスしたい", pa: "ਮੈਂ ਤੁਹਾਡੇ ਖਾਤਿਆਂ ਤੱਕ ਪਹੁੰਚਣਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি আপনার অ্যাকাউন্টে অ্যাক্সেস করতে চাই", id: "Saya ingin mengakses akun Anda", ur: "میں آپ کے اکاؤنٹس تک رسائی چاہتا ہوں", ms: "Saya ingin mengakses akaun anda", it: "Voglio accedere ai tuoi account", tr: "Hesaplarınıza erişmek istiyorum", ta: "நான் உங்கள் கணக்குகளுக்கு அணுக விரும்புகிறேன்", te: "నేను మీ ఖాతాలకు యాక్సెస్ కావాలనుకుంటున్నాను", ko: "귀하의 계정에 접근하고 싶습니다", vi: "Tôi muốn truy cập tài khoản của bạn", pl: "Chcę uzyskać dostęp do Twoich kont", ro: "Vreau să accesez conturile dvs.", nl: "Ik wil toegang tot uw accounts", el: "Θέλω να έχω πρόσβαση στους λογαριασμούς σας", th: "ฉันต้องการเข้าถึงบัญชีของคุณ", cs: "Chci přistupovat k vašim účtům", hu: "Szeretnék hozzáférni a fiókjaidhoz", sv: "Jag vill få åtkomst till dina konton", da: "Jeg vil have adgang til dine konti" })))
        throw new RpcInvalidRequestError()

      permissions["eth_accounts"] = {}

      return await backend.request(request)
    }

    if (method === "wallet_addEthereumChain") {
      const [_] = params as [{ chainId: string }]

      // NOOP

      return
    }

    if (method === "wallet_switchEthereumChain") {
      const [chain] = params as [{ chainId: string }]

      chainId = parseInt(chain.chainId, 16)

      return
    }

    if (method === "wallet_getPermissions") {
      const _ = params

      // NOOP

      return Object.entries(permissions).map(([key, value]) => ({ parentCapability: key, caveats: Object.entries(value).map(([type, value]) => ({ type, value })) }))
    }

    if (method === "wallet_requestPermissions") {
      const [requested] = params as [Record<string, Record<string, unknown>>]

      if (requested["eth_accounts"] == null)
        throw new RpcInvalidRequestError()

      if (!confirm(Lang.match({ en: "I want to access your accounts", zh: "我想访问您的账户", hi: "मैं आपके खातों तक पहुंचना चाहता हूँ", es: "Quiero acceder a sus cuentas", ar: "أريد الوصول إلى حساباتك", fr: "Je veux accéder à vos comptes", de: "Ich möchte auf Ihre Konten zugreifen", ru: "Я хочу получить доступ к вашим аккаунтам", pt: "Quero acessar suas contas", ja: "あなたのアカウントにアクセスしたい", pa: "ਮੈਂ ਤੁਹਾਡੇ ਖਾਤਿਆਂ ਤੱਕ ਪਹੁੰਚਣਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি আপনার অ্যাকাউন্টে অ্যাক্সেস করতে চাই", id: "Saya ingin mengakses akun Anda", ur: "میں آپ کے اکاؤنٹس تک رسائی چاہتا ہوں", ms: "Saya ingin mengakses akaun anda", it: "Voglio accedere ai tuoi account", tr: "Hesaplarınıza erişmek istiyorum", ta: "நான் உங்கள் கணக்குகளுக்கு அணுக விரும்புகிறேன்", te: "నేను మీ ఖాతాలకు యాక్సెస్ కావాలనుకుంటున్నాను", ko: "귀하의 계정에 접근하고 싶습니다", vi: "Tôi muốn truy cập tài khoản của bạn", pl: "Chcę uzyskać dostęp do Twoich kont", ro: "Vreau să accesez conturile dvs.", nl: "Ik wil toegang tot uw accounts", el: "Θέλω να έχω πρόσβαση στους λογαριασμούς σας", th: "ฉันต้องการเข้าถึงบัญชีของคุณ", cs: "Chci přistupovat k vašim účtům", hu: "Szeretnék hozzáférni a fiókjaidhoz", sv: "Jag vill få åtkomst till dina konton", da: "Jeg vil have adgang til dine konti" })))
        throw new RpcInvalidRequestError()

      permissions["eth_accounts"] = {}

      return Object.entries(permissions).map(([key, value]) => ({ parentCapability: key, caveats: Object.entries(value).map(([type, value]) => ({ type, value })) }))
    }

    if (method === "wallet_revokePermissions") {
      const [requested] = params as [Record<string, Record<string, unknown>>]

      if (requested["eth_accounts"] == null)
        throw new RpcInvalidRequestError()

      delete permissions["eth_accounts"]

      return Object.entries(permissions).map(([key, value]) => ({ parentCapability: key, caveats: Object.entries(value).map(([type, value]) => ({ type, value })) }))
    }

    if (method === "solana_connect") {
      const { onlyIfTrusted } = params as { onlyIfTrusted?: boolean }

      if (permissions["eth_accounts"] != null)
        return await backend.request(request)

      if (onlyIfTrusted)
        throw new RpcInvalidRequestError()
      if (!confirm(Lang.match({ en: "I want to access your accounts", zh: "我想访问您的账户", hi: "मैं आपके खातों तक पहुंचना चाहता हूँ", es: "Quiero acceder a sus cuentas", ar: "أريد الوصول إلى حساباتك", fr: "Je veux accéder à vos comptes", de: "Ich möchte auf Ihre Konten zugreifen", ru: "Я хочу получить доступ к вашим аккаунтам", pt: "Quero acessar suas contas", ja: "あなたのアカウントにアクセスしたい", pa: "ਮੈਂ ਤੁਹਾਡੇ ਖਾਤਿਆਂ ਤੱਕ ਪਹੁੰਚਣਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি আপনার অ্যাকাউন্টে অ্যাক্সেস করতে চাই", id: "Saya ingin mengakses akun Anda", ur: "میں آپ کے اکاؤنٹس تک رسائی چاہتا ہوں", ms: "Saya ingin mengakses akaun anda", it: "Voglio accedere ai tuoi account", tr: "Hesaplarınıza erişmek istiyorum", ta: "நான் உங்கள் கணக்குகளுக்கு அணுக விரும்புகிறேன்", te: "నేను మీ ఖాతాలకు యాక్సెస్ కావాలనుకుంటున్నాను", ko: "귀하의 계정에 접근하고 싶습니다", vi: "Tôi muốn truy cập tài khoản của bạn", pl: "Chcę uzyskać dostęp do Twoich kont", ro: "Vreau să accesez conturile dvs.", nl: "Ik wil toegang tot uw accounts", el: "Θέλω να έχω πρόσβαση στους λογαριασμούς σας", th: "ฉันต้องการเข้าถึงบัญชีของคุณ", cs: "Chci přistupovat k vašim účtům", hu: "Szeretnék hozzáférni a fiókjaidhoz", sv: "Jag vill få åtkomst till dina konton", da: "Jeg vil have adgang til dine konti" })))
        throw new RpcInvalidRequestError()

      permissions["eth_accounts"] = {}

      return await backend.request(request)
    }

    if (method === "solana_disconnect") {
      const _ = params

      // NOOP

      return await backend.request(request)
    }

    if (method === "personal_sign") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(Lang.match({ en: "I want to sign a message", zh: "我想签署一条消息", hi: "मैं एक संदेश पर हस्ताक्षर करना चाहता हूँ", es: "Quiero firmar un mensaje", ar: "أريد توقيع رسالة", fr: "Je veux signer un message", de: "Ich möchte eine Nachricht signieren", ru: "Я хочу подписать сообщение", pt: "Quero assinar uma mensagem", ja: "メッセージに署名したい", pa: "ਮੈਂ ਇੱਕ ਸੁਨੇਹੇ 'ਤੇ ਦਸਤਖਤ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি একটি বার্তায় স্বাক্ষর করতে চাই", id: "Saya ingin menandatangani pesan", ur: "میں ایک پیغام پر دستخط کرنا چاہتا ہوں", ms: "Saya ingin menandatangani mesej", it: "Voglio firmare un messaggio", tr: "Bir mesaja imza atmak istiyorum", ta: "நான் ஒரு செய்தியை கையொப்பமிட விரும்புகிறேன்", te: "నేను ఒక సందేశంపై సంతకం చేయాలనుకుంటున్నాను", ko: "메시지에 서명하고 싶습니다", vi: "Tôi muốn ký một tin nhắn", pl: "Chcę podpisać wiadomość", ro: "Vreau să semnez un mesaj", nl: "Ik wil een bericht ondertekenen", el: "Θέλω να υπογράψω ένα μήνυμα", th: "ฉันต้องการลงนามในข้อความ", cs: "Chci podepsat zprávu", hu: "Alá akarok írni egy üzenetet", sv: "Jag vill signera ett meddelande", da: "Jeg vil underskrive en besked" })))
        throw new RpcInvalidRequestError()

      alert(Lang.match({ en: "Open your wallet to sign the message", zh: "打开您的钱包以签署消息", hi: "अपने वॉलेट को खोलें ताकि संदेश पर हस्ताक्षर कर सकें", es: "Abra su billetera para firmar el mensaje", ar: "افتح محفظتك لتوقيع الرسالة", fr: "Ouvrez votre portefeuille pour signer le message", de: "Öffnen Sie Ihre Brieftasche, um die Nachricht zu signieren", ru: "Откройте свой кошелек, чтобы подписать сообщение", pt: "Abra sua carteira para assinar a mensagem", ja: "メッセージに署名するためにウォレットを開いてください", pa: "ਸੁਨੇਹੇ 'ਤੇ ਦਸਤਖਤ ਕਰਨ ਲਈ ਆਪਣਾ ਵਾਲਿਟ ਖੋਲ੍ਹੋ", bn: "বার্তায় স্বাক্ষর করতে আপনার ওয়ালেট খুলুন", id: "Buka dompet Anda untuk menandatangani pesan", ur: "پیغام پر دستخط کرنے کے لیے اپنا بٹو کھولیں", ms: "Buka dompet anda untuk menandatangani mesej", it: "Apri il tuo portafoglio per firmare il messaggio", tr: "Mesajı imzalamak için cüzdanınızı açın", ta: "செய்தியை கையொப்பமிட உங்கள் பணப்பையை திறக்கவும்", te: "సందేశంపై సంతకం చేయడానికి మీ వాలెట్‌ను తెరవండి", ko: "메시지에 서명하려면 지갑을 여세요", vi: "Mở ví của bạn để ký tin nhắn", pl: "Otwórz swój portfel, aby podpisać wiadomość", ro: "Deschideți portofelul pentru a semna mesajul", nl: "Open uw portemonnee om het bericht te ondertekenen", el: "Ανοίξτε το πορτοφόλι σας για να υπογράψετε το μήνυμα", th: "เปิดกระเป๋าเงินของคุณเพื่อลงนามในข้อความ", cs: "Otevřete svou peněženku pro podepsání zprávy", hu: "Nyissa meg a tárcáját az üzenet aláírásához", sv: "Öppna din plånbok för att signera meddelandet", da: "Åbn din tegnebog for at underskrive beskeden" }))

      return await backend.request(request)
    }

    if (method === "eth_signTypedData_v4") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(Lang.match({ en: "I want to sign a message", zh: "我想签署一条消息", hi: "मैं एक संदेश पर हस्ताक्षर करना चाहता हूँ", es: "Quiero firmar un mensaje", ar: "أريد توقيع رسالة", fr: "Je veux signer un message", de: "Ich möchte eine Nachricht signieren", ru: "Я хочу подписать сообщение", pt: "Quero assinar uma mensagem", ja: "メッセージに署名したい", pa: "ਮੈਂ ਇੱਕ ਸੁਨੇਹੇ 'ਤੇ ਦਸਤਖਤ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি একটি বার্তায় স্বাক্ষর করতে চাই", id: "Saya ingin menandatangani pesan", ur: "میں ایک پیغام پر دستخط کرنا چاہتا ہوں", ms: "Saya ingin menandatangani mesej", it: "Voglio firmare un messaggio", tr: "Bir mesaja imza atmak istiyorum", ta: "நான் ஒரு செய்தியை கையொப்பமிட விரும்புகிறேன்", te: "నేను ఒక సందేశంపై సంతకం చేయాలనుకుంటున్నాను", ko: "메시지에 서명하고 싶습니다", vi: "Tôi muốn ký một tin nhắn", pl: "Chcę podpisać wiadomość", ro: "Vreau să semnez un mesaj", nl: "Ik wil een bericht ondertekenen", el: "Θέλω να υπογράψω ένα μήνυμα", th: "ฉันต้องการลงนามในข้อความ", cs: "Chci podepsat zprávu", hu: "Alá akarok írni egy üzenetet", sv: "Jag vill signera ett meddelande", da: "Jeg vil underskrive en besked" })))
        throw new RpcInvalidRequestError()

      alert(Lang.match({ en: "Open your wallet to sign the message", zh: "打开您的钱包以签署消息", hi: "अपने वॉलेट को खोलें ताकि संदेश पर हस्ताक्षर कर सकें", es: "Abra su billetera para firmar el mensaje", ar: "افتح محفظتك لتوقيع الرسالة", fr: "Ouvrez votre portefeuille pour signer le message", de: "Öffnen Sie Ihre Brieftasche, um die Nachricht zu signieren", ru: "Откройте свой кошелек, чтобы подписать сообщение", pt: "Abra sua carteira para assinar a mensagem", ja: "メッセージに署名するためにウォレットを開いてください", pa: "ਸੁਨੇਹੇ 'ਤੇ ਦਸਤਖਤ ਕਰਨ ਲਈ ਆਪਣਾ ਵਾਲਿਟ ਖੋਲ੍ਹੋ", bn: "বার্তায় স্বাক্ষর করতে আপনার ওয়ালেট খুলুন", id: "Buka dompet Anda untuk menandatangani pesan", ur: "پیغام پر دستخط کرنے کے لیے اپنا بٹو کھولیں", ms: "Buka dompet anda untuk menandatangani mesej", it: "Apri il tuo portafoglio per firmare il messaggio", tr: "Mesajı imzalamak için cüzdanınızı açın", ta: "செய்தியை கையொப்பமிட உங்கள் பணப்பையை திறக்கவும்", te: "సందేశంపై సంతకం చేయడానికి మీ వాలెట్‌ను తెరవండి", ko: "메시지에 서명하려면 지갑을 여세요", vi: "Mở ví của bạn để ký tin nhắn", pl: "Otwórz swój portfel, aby podpisać wiadomość", ro: "Deschideți portofelul pentru a semna mesajul", nl: "Open uw portemonnee om het bericht te ondertekenen", el: "Ανοίξτε το πορτοφόλι σας για να υπογράψετε το μήνυμα", th: "เปิดกระเป๋าเงินของคุณเพื่อลงนามในข้อความ", cs: "Otevřete svou peněženku pro podepsání zprávy", hu: "Nyissa meg a tárcáját az üzenet aláírásához", sv: "Öppna din plånbok för att signera meddelandet", da: "Åbn din tegnebog for at underskrive beskeden" }))

      return await backend.request(request)
    }

    if (method === "eth_sendTransaction") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(Lang.match({ en: "I want to sign a transaction", zh: "我想签署一笔交易", hi: "मैं एक लेनदेन पर हस्ताक्षर करना चाहता हूँ", es: "Quiero firmar una transacción", ar: "أريد توقيع معاملة", fr: "Je veux signer une transaction", de: "Ich möchte eine Transaktion signieren", ru: "Я хочу подписать транзакцию", pt: "Quero assinar uma transação", ja: "トランザクションに署名したい", pa: "ਮੈਂ ਇੱਕ ਲੈਣ-ਦੇਣ 'ਤੇ ਦਸਤਖਤ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি একটি লেনদেনে স্বাক্ষর করতে চাই", id: "Saya ingin menandatangani transaksi", ur: "میں ایک لین دین پر دستخط کرنا چاہتا ہوں", ms: "Saya ingin menandatangani transaksi", it: "Voglio firmare una transazione", tr: "Bir işlemi imzalamak istiyorum", ta: "நான் ஒரு பரிவர்த்தனை கையொப்பமிட விரும்புகிறேன்", te: "నేను ఒక లావాదేవీపై సంతకం చేయాలనుకుంటున్నాను", ko: "트랜잭션에 서명하고 싶습니다", vi: "Tôi muốn ký một giao dịch", pl: "Chcę podpisać transakcję", ro: "Vreau să semnez o tranzacție", nl: "Ik wil een transactie ondertekenen", el: "Θέλω να υπογράψω μια συναλλαγή", th: "ฉันต้องการลงนามในธุรกรรม", cs: "Chci podepsat transakci", hu: "Alá akarok írni egy tranzakciót", sv: "Jag vill signera en transaktion", da: "Jeg vil underskrive en transaktion" })))
        throw new RpcInvalidRequestError()

      alert(Lang.match({ en: "Open your wallet to sign the transaction", zh: "打开您的钱包以签署交易", hi: "अपने वॉलेट को खोलें ताकि लेनदेन पर हस्ताक्षर कर सकें", es: "Abra su billetera para firmar la transacción", ar: "افتح محفظتك لتوقيع المعاملة", fr: "Ouvrez votre portefeuille pour signer la transaction", de: "Öffnen Sie Ihre Brieftasche, um die Transaktion zu signieren", ru: "Откройте свой кошелек, чтобы подписать транзакцию", pt: "Abra sua carteira para assinar a transação", ja: "トランザクションに署名するためにウォレットを開いてください", pa: "ਲੈਣ-ਦੇਣ 'ਤੇ ਦਸਤਖਤ ਕਰਨ ਲਈ ਆਪਣਾ ਵਾਲਿਟ ਖੋਲ੍ਹੋ", bn: "লেনদেনে স্বাক্ষর করতে আপনার ওয়ালেট খুলুন", id: "Buka dompet Anda untuk menandatangani transaksi", ur: "لین دین پر دستخط کرنے کے لیے اپنا بٹو کھولیں", ms: "Buka dompet anda untuk menandatangani transaksi", it: "Apri il tuo portafoglio per firmare la transazione", tr: "İşlemi imzalamak için cüzdanınızı açın", ta: "பரிவர்த்தனை கையொப்பமிட உங்கள் பணப்பையை திறக்கவும்", te: "లావాదేవీపై సంతకం చేయడానికి మీ వాలెట్‌ను తెరవండి", ko: "트랜잭션에 서명하려면 지갑을 여세요", vi: "Mở ví của bạn để ký giao dịch", pl: "Otwórz swój portfel, aby podpisać transakcję", ro: "Deschideți portofelul pentru a semna tranzacția", nl: "Open uw portemonnee om de transactie te ondertekenen", el: "Ανοίξτε το πορτοφόλι σας για να υπογράψετε τη συναλλαγή", th: "เปิดกระเป๋าเงินของคุณเพื่อลงนามในธุรกรรม", cs: "Otevřete svou peněženku pro podepsání transakce", hu: "Nyissa meg a tárcáját a tranzakció aláírásához", sv: "Öppna din plånbok för att signera transaktionen", da: "Åbn din tegnebog for at underskrive transaktionen" }))

      return await backend.request(request)
    }

    if (method === "solana_signMessage") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(Lang.match({ en: "I want to sign a message", zh: "我想签署一条消息", hi: "मैं एक संदेश पर हस्ताक्षर करना चाहता हूँ", es: "Quiero firmar un mensaje", ar: "أريد توقيع رسالة", fr: "Je veux signer un message", de: "Ich möchte eine Nachricht signieren", ru: "Я хочу подписать сообщение", pt: "Quero assinar uma mensagem", ja: "メッセージに署名したい", pa: "ਮੈਂ ਇੱਕ ਸੁਨੇਹੇ 'ਤੇ ਦਸਤਖਤ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি একটি বার্তায় স্বাক্ষর করতে চাই", id: "Saya ingin menandatangani pesan", ur: "میں ایک پیغام پر دستخط کرنا چاہتا ہوں", ms: "Saya ingin menandatangani mesej", it: "Voglio firmare un messaggio", tr: "Bir mesaja imza atmak istiyorum", ta: "நான் ஒரு செய்தியை கையொப்பமிட விரும்புகிறேன்", te: "నేను ఒక సందేశంపై సంతకం చేయాలనుకుంటున్నాను", ko: "메시지에 서명하고 싶습니다", vi: "Tôi muốn ký một tin nhắn", pl: "Chcę podpisać wiadomość", ro: "Vreau să semnez un mesaj", nl: "Ik wil een bericht ondertekenen", el: "Θέλω να υπογράψω ένα μήνυμα", th: "ฉันต้องการลงนามในข้อความ", cs: "Chci podepsat zprávu", hu: "Alá akarok írni egy üzenetet", sv: "Jag vill signera ett meddelande", da: "Jeg vil underskrive en besked" })))
        throw new RpcInvalidRequestError()

      alert(Lang.match({ en: "Open your wallet to sign the message", zh: "打开您的钱包以签署消息", hi: "अपने वॉलेट को खोलें ताकि संदेश पर हस्ताक्षर कर सकें", es: "Abra su billetera para firmar el mensaje", ar: "افتح محفظتك لتوقيع الرسالة", fr: "Ouvrez votre portefeuille pour signer le message", de: "Öffnen Sie Ihre Brieftasche, um die Nachricht zu signieren", ru: "Откройте свой кошелек, чтобы подписать сообщение", pt: "Abra sua carteira para assinar a mensagem", ja: "メッセージに署名するためにウォレットを開いてください", pa: "ਸੁਨੇਹੇ 'ਤੇ ਦਸਤਖਤ ਕਰਨ ਲਈ ਆਪਣਾ ਵਾਲਿਟ ਖੋਲ੍ਹੋ", bn: "বার্তায় স্বাক্ষর করতে আপনার ওয়ালেট খুলুন", id: "Buka dompet Anda untuk menandatangani pesan", ur: "پیغام پر دستخط کرنے کے لیے اپنا بٹو کھولیں", ms: "Buka dompet anda untuk menandatangani mesej", it: "Apri il tuo portafoglio per firmare il messaggio", tr: "Mesajı imzalamak için cüzdanınızı açın", ta: "செய்தியை கையொப்பமிட உங்கள் பணப்பையை திறக்கவும்", te: "సందేశంపై సంతకం చేయడానికి మీ వాలెట్‌ను తెరవండి", ko: "메시지에 서명하려면 지갑을 여세요", vi: "Mở ví của bạn để ký tin nhắn", pl: "Otwórz swój portfel, aby podpisać wiadomość", ro: "Deschideți portofelul pentru a semna mesajul", nl: "Open uw portemonnee om het bericht te ondertekenen", el: "Ανοίξτε το πορτοφόλι σας για να υπογράψετε το μήνυμα", th: "เปิดกระเป๋าเงินของคุณเพื่อลงนามในข้อความ", cs: "Otevřete svou peněženku pro podepsání zprávy", hu: "Nyissa meg a tárcáját az üzenet aláírásához", sv: "Öppna din plånbok för att signera meddelandet", da: "Åbn din tegnebog for at underskrive beskeden" }))

      return await backend.request(request)
    }

    if (method === "solana_signTransaction") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(Lang.match({ en: "I want to sign a transaction", zh: "我想签署一笔交易", hi: "मैं एक लेनदेन पर हस्ताक्षर करना चाहता हूँ", es: "Quiero firmar una transacción", ar: "أريد توقيع معاملة", fr: "Je veux signer une transaction", de: "Ich möchte eine Transaktion signieren", ru: "Я хочу подписать транзакцию", pt: "Quero assinar uma transação", ja: "トランザクションに署名したい", pa: "ਮੈਂ ਇੱਕ ਲੈਣ-ਦੇਣ 'ਤੇ ਦਸਤਖਤ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ", bn: "আমি একটি লেনদেনে স্বাক্ষর করতে চাই", id: "Saya ingin menandatangani transaksi", ur: "میں ایک لین دین پر دستخط کرنا چاہتا ہوں", ms: "Saya ingin menandatangani transaksi", it: "Voglio firmare una transazione", tr: "Bir işlemi imzalamak istiyorum", ta: "நான் ஒரு பரிவர்த்தனை கையொப்பமிட விரும்புகிறேன்", te: "నేను ఒక లావాదేవీపై సంతకం చేయాలనుకుంటున్నాను", ko: "트랜잭션에 서명하고 싶습니다", vi: "Tôi muốn ký một giao dịch", pl: "Chcę podpisać transakcję", ro: "Vreau să semnez o tranzacție", nl: "Ik wil een transactie ondertekenen", el: "Θέλω να υπογράψω μια συναλλαγή", th: "ฉันต้องการลงนามในธุรกรรม", cs: "Chci podepsat transakci", hu: "Alá akarok írni egy tranzakciót", sv: "Jag vill signera en transaktion", da: "Jeg vil underskrive en transaktion" })))
        throw new RpcInvalidRequestError()

      alert(Lang.match({ en: "Open your wallet to sign the transaction", zh: "打开您的钱包以签署交易", hi: "अपने वॉलेट को खोलें ताकि लेनदेन पर हस्ताक्षर कर सकें", es: "Abra su billetera para firmar la transacción", ar: "افتح محفظتك لتوقيع المعاملة", fr: "Ouvrez votre portefeuille pour signer la transaction", de: "Öffnen Sie Ihre Brieftasche, um die Transaktion zu signieren", ru: "Откройте свой кошелек, чтобы подписать транзакцию", pt: "Abra sua carteira para assinar a transação", ja: "トランザクションに署名するためにウォレットを開いてください", pa: "ਲੈਣ-ਦੇਣ 'ਤੇ ਦਸਤਖਤ ਕਰਨ ਲਈ ਆਪਣਾ ਵਾਲਿਟ ਖੋਲ੍ਹੋ", bn: "লেনদেনে স্বাক্ষর করতে আপনার ওয়ালেট খুলুন", id: "Buka dompet Anda untuk menandatangani transaksi", ur: "لین دین پر دستخط کرنے کے لیے اپنا بٹو کھولیں", ms: "Buka dompet anda untuk menandatangani transaksi", it: "Apri il tuo portafoglio per firmare la transazione", tr: "İşlemi imzalamak için cüzdanınızı açın", ta: "பரிவர்த்தனை கையொப்பமிட உங்கள் பணப்பையை திறக்கவும்", te: "లావాదేవీపై సంతకం చేయడానికి మీ వాలెట్‌ను తెరవండి", ko: "트랜잭션에 서명하려면 지갑을 여세요", vi: "Mở ví của bạn để ký giao dịch", pl: "Otwórz swój portfel, aby podpisać transakcję", ro: "Deschideți portofelul pentru a semna tranzacția", nl: "Open uw portemonnee om de transactie te ondertekenen", el: "Ανοίξτε το πορτοφόλι σας για να υπογράψετε τη συναλλαγή", th: "เปิดกระเป๋าเงินของคุณเพื่อลงนามในธุรกรรม", cs: "Otevřete svou peněženku pro podepsání transakce", hu: "Nyissa meg a tárcáját a tranzakció aláírásához", sv: "Öppna din plånbok för att signera transaktionen", da: "Åbn din tegnebog for at underskrive transaktionen" }))

      return await backend.request(request)
    }

    if (method.startsWith("eth_")) {
      const _ = params

      const chain = chainlist.find(x => x.chainId === chainId)

      if (chain == null)
        throw new RpcInvalidRequestError()

      const headers = { "Content-Type": "application/json" }

      const body = JSON.stringify(request)
      const http = await fetch(chain.rpc, { method: "POST", headers, body })

      if (!http.ok)
        throw new RpcInternalError()

      const json = await http.json()

      return RpcResponse.from(json).getOrThrow()
    }

    if (method === "web3_clientVersion") {
      const _ = params

      const version = chrome.runtime.getManifest().version

      return `BrumeClick/${version}`
    }

    throw new RpcMethodNotFoundError()
  }

  addEventListener("pipe:requestSync", (event) => {
    try {
      const { formData } = event

      const rawrequest = formData.get("request") as string
      const rpcrequest = RpcRequest.from(JSON.parse(rawrequest))

      const rpcresponse = new RpcOk(null, routeSync(rpcrequest))
      const rawresponse = JSON.stringify(rpcresponse)

      formData.set("response", rawresponse)

      return
    } catch (error: unknown) {
      console.debug(error)

      const { formData } = event

      const rpcresponse = new RpcErr(null, RpcError.rewrap(error))
      const rawresponse = JSON.stringify(rpcresponse)

      formData.set("response", rawresponse)

      return
    }
  })

  addEventListener("pipe:request", async (event) => {
    try {
      const request = RpcRequest.from(event.detail)

      console.debug("->", request)

      const response = new RpcOk(request.id, await route(request))

      console.debug("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(event.detail)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    }
  })

}