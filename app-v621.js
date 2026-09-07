(() => {
  const CONFIG = window.HISTORY_APP_CONFIG || {};
  const SUPABASE_KEY = CONFIG.supabasePublishableKey || CONFIG.supabaseAnonKey || "";
  const CONFIG_HAS_SUPABASE = Boolean(CONFIG.supabaseUrl && SUPABASE_KEY);
  const SDK_HAS_SUPABASE = Boolean(window.supabase && typeof window.supabase.createClient === "function");
  const HAS_SUPABASE = Boolean(CONFIG_HAS_SUPABASE && SDK_HAS_SUPABASE);
  const SDK_STATUS = window.__GUCHI_SUPABASE_SDK_STATUS || {};
  const db = HAS_SUPABASE ? window.supabase.createClient(CONFIG.supabaseUrl, SUPABASE_KEY) : null;
  const STORAGE_KEY = "guchi-history-writing-v5";
  const SESSION_KEY = "guchi-history-writing-v5-session";

  const seedAssignment = {
    id: "hokkaido-2025-q1-2",
    title: "9月第1週 日本史論述演習",
    subject: "japanese",
    theme: "史料・図像から短字数で説明する：古代貨幣のデザイン比較",
    goal: "古代貨幣の図像的特徴を、史料本文と模式図から短文で説明する。",
    method: "設問条件を分解する → 必須要素を置く → 字数内で比較・因果を1文にまとめる",
    source: "北海道大学2025年度 日本史 第1問 問2（元の過去問から解答に必要な部分を抜粋）",
    prompt: "下線部『和同開珎をはじめとする皇朝（本朝）十二銭とは表面のデザインが異なっている』について、和同開珎と富本銭との表面のデザインの相違点を、50字以内で説明しなさい。",
    limit: 50,
    minRatio: 0.8,
    showCoins: true,
    coinNotes: {
      wada: "漢字4字の銭文が方孔の周囲に配置される",
      fuhon: "漢字2字の銭文と七曜文が配置される"
    },
    beforeFields: ["設問は何を聞いているか", "時期・地域・人物"],
    requiredElements: ["", "", ""],
    answerFlow: "",
    teacherModel: "",
    teacherMemo: "",
    published: true,
    createdAt: new Date().toISOString()
  };

  const initialState = {
    mode: HAS_SUPABASE ? "supabase" : "local",
    assignments: HAS_SUPABASE ? [] : [seedAssignment],
    students: HAS_SUPABASE ? [] : [
      { id: "student-a", name: "生徒A", loginCode: "", subjects:["japanese","world"], active:true },
      { id: "student-b", name: "生徒B", loginCode: "", subjects:["japanese","world"], active:true },
      { id: "student-c", name: "生徒C", loginCode: "", subjects:["japanese","world"], active:true }
    ],
    submissions: []
  };

  let state = loadState();
  let session = loadSession();
  let currentView = session ? (session.role === "teacher" ? "teacher-dashboard" : "student-home") : "login";
  let selectedAssignmentId = seedAssignment.id;
  let selectedSubmissionId = null;
  let pendingPhotoDataUrl = null;
  let pendingWorksheetPdfDataUrl = null;
  let pendingWorksheetPdfName = "";
  let pendingWorksheetPdfStored = false;
  let pendingWorksheetPdfObjectUrl = null;

  const root = document.getElementById("app");

  function normalizeState(input){
    const base = { ...structuredClone(initialState), ...(input || {}) };
    base.assignments = (base.assignments || []).map(a => ({ subject:"japanese", ...a }));
    base.students = (base.students || []).map(st => ({ loginCode:"", subjects:["japanese","world"], active:true, ...st }));
    base.submissions = base.submissions || [];
    return base;
  }
  function loadState(){
    if(HAS_SUPABASE) return normalizeState(structuredClone(initialState));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalizeState(structuredClone(initialState));
      return normalizeState(JSON.parse(raw));
    } catch {
      return normalizeState(structuredClone(initialState));
    }
  }
  let remoteSyncQueue = Promise.resolve();
  function saveState(){
    if(!HAS_SUPABASE){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return Promise.resolve();
    }
    remoteSyncQueue = remoteSyncQueue.then(() => syncRemoteState()).catch(err => {
      console.error("Supabase sync failed", err);
      showSyncError(err);
    });
    return remoteSyncQueue;
  }
  function loadSession(){
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  }
  function saveSession(){
    if(session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }
  function uid(prefix="id"){
    if(HAS_SUPABASE && window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  }
  function esc(s=""){
    return String(s).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }
  function nl2br(s=""){ return esc(s).replace(/\n/g,"<br>"); }
  function charCount(s=""){ return [...String(s)].length; }
  function subjectMeta(subject){
    return subject === "world"
      ? { key:"world", label:"世界史", short:"世", css:"world" }
      : { key:"japanese", label:"日本史", short:"日", css:"japanese" };
  }
  function subjectBadge(subject){
    const m=subjectMeta(subject);
    return `<span class="subject-badge ${m.css}"><span class="subject-mark">${m.short}</span>${m.label}</span>`;
  }
  function randomLoginCode(){ return String(Math.floor(1000 + Math.random()*9000)); }
  function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
  async function compressImageFile(file, maxSide=1400, quality=.72){
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }
  async function fileToDataUrl(file){
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ========================================================
  // Supabase shared mode
  // ========================================================
  let lastSyncErrorAt = 0;
  function showSyncError(err){
    if(!HAS_SUPABASE) return;
    const now=Date.now();
    if(now-lastSyncErrorAt < 5000) return;
    lastSyncErrorAt=now;
    const message = err?.message || String(err || "不明なエラー");
    alert(`Supabaseへの保存に失敗しました。\n${message}\n\n設定または通信状態を確認してください。`);
  }
  function dataUrlToBlob(dataUrl){
    const [meta, body] = String(dataUrl).split(",");
    const mime = /data:([^;]+)/.exec(meta || "")?.[1] || "application/octet-stream";
    const binary = atob(body || "");
    const bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes], {type:mime});
  }
  function safeFileName(name="file"){
    return String(name).replace(/[\\/:*?"<>|#%{}]/g,"-").replace(/\s+/g,"-").slice(0,120) || "file";
  }
  async function createSignedUrl(bucket, path){
    if(!path) return "";
    const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60*60*6);
    if(error){ console.warn("signed url", bucket, path, error); return ""; }
    return data?.signedUrl || "";
  }
  function assignmentToRow(a){
    return {
      id:a.id,
      subject:a.subject || "japanese",
      title:a.title || "",
      theme:a.theme || null,
      goal:a.goal || null,
      method:a.method || null,
      source:a.source || null,
      prompt:a.prompt || "",
      char_limit:Number(a.limit || 50),
      min_ratio:Number(a.minRatio || .8),
      before_fields:a.beforeFields || [],
      required_elements:a.requiredElements || [],
      answer_flow:a.answerFlow || null,
      teacher_model:a.teacherModel || null,
      worksheet_pdf_path:a.worksheetPdfPath || null,
      worksheet_pdf_name:a.worksheetPdfName || null,
      published:Boolean(a.published),
      created_at:a.createdAt || new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
  }
  function assignmentFromRow(r){
    return {
      id:r.id, subject:r.subject || "japanese", title:r.title || "", theme:r.theme || "", goal:r.goal || "", method:r.method || "", source:r.source || "", prompt:r.prompt || "",
      limit:Number(r.char_limit || 50), minRatio:Number(r.min_ratio || .8), beforeFields:r.before_fields || [], requiredElements:r.required_elements || [], answerFlow:r.answer_flow || "", teacherModel:r.teacher_model || "",
      worksheetPdfPath:r.worksheet_pdf_path || "", worksheetPdfName:r.worksheet_pdf_name || "", worksheetPdfDataUrl:"", published:Boolean(r.published), createdAt:r.created_at,
      showCoins:false
    };
  }
  function studentToRow(st){
    return { id:st.id, display_name:st.name || "", subjects:st.subjects?.length ? st.subjects : ["japanese","world"], active:st.active !== false, created_at:st.createdAt || new Date().toISOString(), updated_at:new Date().toISOString() };
  }
  function studentFromRow(r){
    return { id:r.id, name:r.display_name || "", loginCode:"", subjects:r.subjects?.length ? r.subjects : ["japanese","world"], active:r.active !== false, createdAt:r.created_at };
  }
  function submissionToRow(s){
    return {
      id:s.id,
      assignment_id:s.assignmentId,
      student_id:s.studentId,
      before_answers:s.beforeAnswers || [],
      own_required:s.ownRequired || [],
      own_flow:s.ownFlow || null,
      answer_image_path:s.answerImagePath || null,
      ai_transcript_raw:s.aiTranscriptRaw || null,
      answer:s.answer || null,
      self_checks:s.selfChecks || [],
      status:s.status || "draft",
      feedback:s.feedback || null,
      rewrite:s.rewrite || null,
      rewrite_submitted_at:s.rewriteSubmittedAt || null,
      submitted_at:s.submittedAt || null,
      returned_at:s.returnedAt || null,
      updated_at:new Date().toISOString()
    };
  }
  function submissionFromRow(r){
    return {
      id:r.id, assignmentId:r.assignment_id, studentId:r.student_id, beforeAnswers:r.before_answers || [], ownRequired:r.own_required || [], ownFlow:r.own_flow || "", answerImagePath:r.answer_image_path || "", answerImage:"", aiTranscriptRaw:r.ai_transcript_raw || "", answer:r.answer || "", selfChecks:r.self_checks || [], status:r.status || "draft", feedback:r.feedback || null, rewrite:r.rewrite || "", rewriteSubmittedAt:r.rewrite_submitted_at || null, submittedAt:r.submitted_at || null, returnedAt:r.returned_at || null, updatedAt:r.updated_at
    };
  }
  async function uploadWorksheetPdfIfNeeded(a){
    if(!HAS_SUPABASE || !a?.worksheetPdfDataUrl?.startsWith("data:")) return;
    const path = `${a.id}/${safeFileName(a.worksheetPdfName || "worksheet.pdf")}`;
    const blob = dataUrlToBlob(a.worksheetPdfDataUrl);
    const { error } = await db.storage.from("worksheet-pdfs").upload(path, blob, { upsert:true, contentType:blob.type || "application/pdf" });
    if(error) throw error;
    a.worksheetPdfPath = path;
    a.worksheetPdfDataUrl = await createSignedUrl("worksheet-pdfs", path);
  }
  async function uploadAnswerImageIfNeeded(s){
    if(!HAS_SUPABASE || !s?.answerImage?.startsWith("data:")) return;
    const { data:userData, error:userError } = await db.auth.getUser();
    if(userError || !userData?.user) throw userError || new Error("ログイン状態を確認できません。");
    const path = `${userData.user.id}/${s.assignmentId}/${s.id}.jpg`;
    const blob = dataUrlToBlob(s.answerImage);
    const { error } = await db.storage.from("answer-images").upload(path, blob, { upsert:true, contentType:blob.type || "image/jpeg" });
    if(error) throw error;
    s.answerImagePath = path;
    s.answerImage = await createSignedUrl("answer-images", path);
    if(selectedSubmissionId === s.id || (session?.role === "student" && session.studentId === s.studentId && selectedAssignmentId === s.assignmentId)) pendingPhotoDataUrl = s.answerImage;
  }
  async function syncRemoteState(){
    if(!HAS_SUPABASE || !session) return;
    if(session.role === "teacher"){
      for(const a of state.assignments) await uploadWorksheetPdfIfNeeded(a);
      if(state.students.length){
        const { error } = await db.from("students").upsert(state.students.map(studentToRow), {onConflict:"id"});
        if(error) throw error;
        const secrets = state.students.filter(st => st.loginCode).map(st => ({student_id:st.id, login_code:String(st.loginCode), updated_at:new Date().toISOString()}));
        if(secrets.length){ const { error:e2 }=await db.from("student_secrets").upsert(secrets,{onConflict:"student_id"}); if(e2) throw e2; }
      }
      if(state.assignments.length){ const { error }=await db.from("assignments").upsert(state.assignments.map(assignmentToRow),{onConflict:"id"}); if(error) throw error; }
      if(state.submissions.length){ const { error }=await db.from("submissions").upsert(state.submissions.map(submissionToRow),{onConflict:"id"}); if(error) throw error; }
    } else if(session.role === "student"){
      const mine = state.submissions.filter(s => s.studentId === session.studentId);
      for(const s of mine) await uploadAnswerImageIfNeeded(s);
      if(mine.length){ const { error }=await db.from("submissions").upsert(mine.map(submissionToRow),{onConflict:"id"}); if(error) throw error; }
    }
  }
  async function loadRemoteState(){
    if(!HAS_SUPABASE || !session) return;
    const [assignmentsRes, studentsRes, submissionsRes] = await Promise.all([
      db.from("assignments").select("*").order("created_at",{ascending:false}),
      db.from("students").select("*").order("created_at",{ascending:true}),
      db.from("submissions").select("*").order("updated_at",{ascending:false})
    ]);
    for(const res of [assignmentsRes,studentsRes,submissionsRes]) if(res.error) throw res.error;
    const assignments=(assignmentsRes.data || []).map(assignmentFromRow);
    const students=(studentsRes.data || []).map(studentFromRow);
    const submissions=(submissionsRes.data || []).map(submissionFromRow);

    if(session.role === "teacher" && students.length){
      const { data:secrets, error } = await db.from("student_secrets").select("student_id,login_code");
      if(error) throw error;
      const codeMap = new Map((secrets || []).map(x => [x.student_id, x.login_code]));
      students.forEach(st => st.loginCode = codeMap.get(st.id) || "");
    }
    await Promise.all(assignments.map(async a => { if(a.worksheetPdfPath) a.worksheetPdfDataUrl=await createSignedUrl("worksheet-pdfs",a.worksheetPdfPath); }));
    await Promise.all(submissions.map(async s => { if(s.answerImagePath) s.answerImage=await createSignedUrl("answer-images",s.answerImagePath); }));
    state=normalizeState({mode:"supabase",assignments,students,submissions});
    if(selectedAssignmentId && !state.assignments.some(a=>a.id===selectedAssignmentId)) selectedAssignmentId=state.assignments[0]?.id || null;
  }
  async function deleteRemoteAssignment(id){
    if(!HAS_SUPABASE) return;
    const { error }=await db.from("assignments").delete().eq("id",id); if(error) throw error;
  }
  async function deleteRemoteStudent(id){
    if(!HAS_SUPABASE) return;
    const { error }=await db.from("students").delete().eq("id",id); if(error) throw error;
  }
  async function teacherSignIn(email,password){
    const { data, error }=await db.auth.signInWithPassword({email,password});
    if(error) throw error;
    if(!data?.user || data.user.is_anonymous) throw new Error("先生アカウントでログインできませんでした。");
    session={role:"teacher",name:"先生",email:data.user.email || email};
    saveSession();
    await loadRemoteState();
  }
  async function studentSignIn(name,code){
    const current=await db.auth.getSession();
    if(current.data?.session?.user && !current.data.session.user.is_anonymous) await db.auth.signOut();
    let authSession=(await db.auth.getSession()).data?.session;
    if(!authSession){
      const { data, error }=await db.auth.signInAnonymously();
      if(error) throw error;
      authSession=data.session;
    }
    const { data, error }=await db.functions.invoke("student-login",{body:{name,code}});
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    const st=data?.student;
    if(!st?.id) throw new Error("生徒情報を取得できませんでした。");
    session={role:"student",studentId:st.id,name:st.name};
    saveSession();
    await loadRemoteState();
  }
  async function restoreSupabaseSession(){
    if(!HAS_SUPABASE) return;
    const { data:{session:authSession} }=await db.auth.getSession();
    if(!authSession){ session=null; saveSession(); return; }
    const saved=loadSession();
    if(!authSession.user.is_anonymous){
      session={role:"teacher",name:"先生",email:authSession.user.email || saved?.email || ""};
      saveSession();
      await loadRemoteState();
      return;
    }
    let studentId=saved?.role === "student" ? saved.studentId : null;
    if(!studentId){
      const { data }=await db.rpc("current_student_id");
      studentId=data || null;
    }
    if(studentId){
      session={role:"student",studentId,name:saved?.name || "生徒"};
      saveSession();
      await loadRemoteState();
      const st=state.students.find(x=>x.id===studentId);
      if(st){ session.name=st.name; saveSession(); }
    } else {
      session=null; saveSession();
    }
  }

  async function parseWorksheetPdf(pdfDataUrl, file){
    if(CONFIG.worksheetParseEndpoint){
      const headers = { "Content-Type":"application/json" };
      if(SUPABASE_KEY){
        headers.apikey = SUPABASE_KEY;
        const authSession=(await db?.auth.getSession())?.data?.session;
        headers.Authorization = `Bearer ${authSession?.access_token || SUPABASE_KEY}`;
      }
      const res = await fetch(CONFIG.worksheetParseEndpoint, {
        method:"POST",
        headers,
        body:JSON.stringify({
          pdfDataUrl,
          fileName:file.name,
          purpose:"history-writing-assignment"
        })
      });
      if(!res.ok) throw new Error(`Worksheet parse endpoint error: ${res.status}`);
      const data = await res.json();
      return { ...data, demo:false };
    }

    await wait(900);
    const looksLikeDemoSheet = /基本|folder|フォルダ|日本史|論述/i.test(file.name);
    if(looksLikeDemoSheet){
      return {
        demo:true,
        subject:"japanese",
        title:"9月第1週 日本史論述演習",
        theme:"史料・図像から短字数で説明する：古代貨幣のデザイン比較",
        goal:"古代貨幣の図像的特徴を、史料本文と模式図から短文で説明する。",
        method:"設問条件を分解する → 必須要素を置く → 字数内で比較を1文にまとめる",
        source:"北海道大学2025年度 日本史 第1問 問2",
        prompt:"下線部『和同開珎をはじめとする皇朝（本朝）十二銭とは表面のデザインが異なっている』について、和同開珎と富本銭との表面のデザインの相違点を、50字以内で説明しなさい。",
        limit:50,
        beforeFields:["設問は何を聞いているか","時期・地域・人物"],
        requiredElements:[
          "和同開珎は漢字4字の銭文を方孔の周囲に配置する",
          "富本銭は『富本』2字と七曜文を配置する",
          "両者の相違が比較表現で明確になっている"
        ],
        answerFlow:"和同開珎の特徴 → 対して/一方 → 富本銭の特徴",
        teacherModel:"和同開珎は方孔の周囲に四字を配するが、富本銭は富本二字と七曜文を配する。",
        summary:"PDF内のタイトル・設問・字数・学習前整理欄・自己点検欄を、Web課題の項目へ振り分けました。"
      };
    }
    const stem = file.name.replace(/\.pdf$/i, "");
    return {
      demo:true,
      subject:/世界史|world/i.test(file.name) ? "world" : "japanese",
      title:stem || "PDFから作成した論述課題",
      theme:"PDFから自動作成（API接続前のデモ）",
      goal:"AI接続後、この欄にはPDFから読み取った到達目標が入ります。",
      method:"設問条件を分解する → 必須要素を置く → 字数内でまとめる",
      source:file.name,
      prompt:"API接続後、ここにPDFから抽出した問題文が自動入力されます。現在は先生が確認・修正してください。",
      limit:50,
      beforeFields:["設問は何を聞いているか","時期・地域・人物"],
      requiredElements:["","", ""],
      answerFlow:"",
      teacherModel:"",
      summary:"PDFアップロードから入力欄へ自動反映する操作フローのデモです。任意PDFの実解析はAPI接続後に有効になります。"
    };
  }

  async function transcribeAnswerImage(imageDataUrl, assignment){
    if(CONFIG.ocrEndpoint){
      const headers = { "Content-Type":"application/json" };
      if(SUPABASE_KEY){
        headers.apikey = SUPABASE_KEY;
        const authSession=(await db?.auth.getSession())?.data?.session;
        headers.Authorization = `Bearer ${authSession?.access_token || SUPABASE_KEY}`;
      }
      const res = await fetch(CONFIG.ocrEndpoint, {
        method:"POST",
        headers,
        body:JSON.stringify({
          imageDataUrl,
          assignmentId:assignment.id,
          prompt:assignment.prompt,
          charLimit:assignment.limit
        })
      });
      if(!res.ok) throw new Error(`OCR endpoint error: ${res.status}`);
      const data = await res.json();
      const text = data.text || data.transcript || data.output_text || "";
      if(!text) throw new Error("OCR response did not include text");
      return { text, demo:false };
    }
    await wait(700);
    const text = assignment.id === "hokkaido-2025-q1-2"
      ? "和同開珎は四字の銭文を方孔の周囲に配するが、富本銭は富本二字と七曜文を配する。"
      : "ここにAIが読み取った手書き答案が入ります。API接続後は実際の写真から自動で文字起こしされます。";
    return { text, demo:true };
  }
  function assignmentById(id){ return state.assignments.find(a => a.id === id); }
  function submissionFor(studentId, assignmentId){
    return state.submissions.find(s => s.studentId === studentId && s.assignmentId === assignmentId);
  }
  function statusLabel(s){
    if(!s) return `<span class="badge gray">未提出</span>`;
    if(s.status === "returned") return `<span class="badge ok">返却済</span>`;
    if(s.status === "submitted") return `<span class="badge warn">提出済</span>`;
    return `<span class="badge gray">下書き</span>`;
  }

  function topbar(){
    if(!session) return "";
    return `
      <header class="topbar">
        <div class="brand"><span class="brand-badge">G</span><span>GUCHIの歴史添削隊</span></div>
        <div class="top-actions">
          <span class="small muted small-hide">${session.role === "teacher" ? "先生モード" : esc(session.name)}</span>
          <span class="badge ${state.mode === "local" ? "gray" : "ok"}">${state.mode === "local" ? "デモ保存" : "共有DB"}</span>
          <button class="btn secondary" data-action="logout">ログアウト</button>
        </div>
      </header>`;
  }

  function render(){
    if(!session){ renderLogin(); return; }
    if(session.role === "teacher") renderTeacher(); else renderStudent();
  }

  function renderLogin(){
    root.innerHTML = `
      <div class="app-shell">
        <div class="container">
          <div class="login-box card pad">
            <div class="brand" style="margin-bottom:18px"><span class="brand-badge">G</span><span>GUCHIの歴史添削隊</span></div>
            <img class="login-hero-image" src="assets/guchi-history-hero.webp" alt="GUCHIの歴史添削隊 日本史と世界史">
            <h1 style="font-size:30px">日本史・世界史の論述を、書いて伸ばす。</h1>
            <div class="notice ${HAS_SUPABASE ? "info" : (CONFIG_HAS_SUPABASE ? "warn" : "info")}" style="margin:18px 0">${HAS_SUPABASE
              ? "Supabase共有モードです。先生・生徒が別端末から使えます。"
              : CONFIG_HAS_SUPABASE
                ? `Supabaseの接続設定は入っていますが、ブラウザ側のSupabaseライブラリを読み込めませんでした。ページ再読み込みでも直らない場合はネットワーク側でCDNが遮断されている可能性があります。${SDK_STATUS.attempts?.length ? `（読み込み試行 ${SDK_STATUS.attempts.length}件）` : ""}`
                : "現在はブラウザ内デモモードです。Supabase接続後に複数端末で共有できます。"}</div>
            <div class="grid two">
              <div class="role-card card" style="box-shadow:none">
                <div class="role-icon teacher-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.5 4.75h7.25a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z"/>
                    <path d="M8 3.5h4.25a1.5 1.5 0 0 1 1.5 1.5v1H6.5V5A1.5 1.5 0 0 1 8 3.5Z"/>
                    <path d="m9 13 1.7 1.7 4.2-4.4"/>
                    <path d="M17.75 7.25 20 9.5l-2.9 2.9-2.25.55.55-2.25 2.35-3.45Z"/>
                  </svg>
                </div>
                <h3>先生</h3>
                <p class="small muted">出題・提出確認・添削・返却</p>
                ${HAS_SUPABASE ? `
                  <div class="field" style="text-align:left;margin-top:14px"><label>メールアドレス</label><input id="teacherEmail" type="text" autocomplete="username" placeholder="先生用Supabase Authメール"></div>
                  <div class="field" style="text-align:left"><label>パスワード</label><input id="teacherPassword" type="password" autocomplete="current-password" placeholder="パスワード"></div>
                ` : ""}
                <button class="btn" data-login-role="teacher">先生として入る</button>
              </div>
              <div class="role-card card" style="box-shadow:none">
                <div class="role-icon student-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 5.5c2.7-.65 5.1-.2 7.5 1.3v12c-2.4-1.5-4.8-1.95-7.5-1.3v-12Z"/>
                    <path d="M19.5 5.5c-2.7-.65-5.1-.2-7.5 1.3v12c2.4-1.5 4.8-1.95 7.5-1.3v-12Z"/>
                    <path d="m15.25 10.25 3.35-3.35 1.5 1.5-3.35 3.35-2 .5.5-2Z"/>
                  </svg>
                </div>
                <h3>生徒</h3>
                ${HAS_SUPABASE ? `
                  <div class="field" style="text-align:left;margin-top:12px"><label>名前</label><input id="studentLoginName" type="text" autocomplete="name" placeholder="先生に登録された名前"></div>
                ` : `
                  <div class="field" style="text-align:left;margin-top:12px">
                    <label>名前</label>
                    <select id="studentLoginSelect">
                      ${state.students.filter(s => s.active !== false).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}
                    </select>
                  </div>
                `}
                <div class="field" style="text-align:left"><label>ログインコード</label><input id="studentLoginCode" inputmode="numeric" maxlength="8" placeholder="先生から伝えられたコード"></div>
                <button class="btn" data-login-role="student">生徒として入る</button>
              </div>
            </div>
            <div class="footer">GUCHIの歴史添削隊 v6.2.1 / Japanese & World History Writing</div>
          </div>
        </div>
      </div>`;
    root.querySelectorAll("[data-login-role]").forEach(btn => btn.addEventListener("click", async () => {
      const role = btn.dataset.loginRole;
      btn.disabled=true;
      const original=btn.textContent;
      btn.textContent="ログイン中…";
      try{
        if(HAS_SUPABASE){
          if(role === "teacher"){
            const email=(document.getElementById("teacherEmail")?.value || "").trim();
            const password=document.getElementById("teacherPassword")?.value || "";
            if(!email || !password) throw new Error("先生のメールアドレスとパスワードを入力してください。");
            await teacherSignIn(email,password);
          }else{
            const name=(document.getElementById("studentLoginName")?.value || "").trim();
            const code=(document.getElementById("studentLoginCode")?.value || "").trim();
            if(!name || !code) throw new Error("名前とログインコードを入力してください。");
            await studentSignIn(name,code);
          }
        }else{
          if(role === "teacher") session = { role:"teacher", name:"先生" };
          else {
            const id = document.getElementById("studentLoginSelect").value;
            const st = state.students.find(s => s.id === id && s.active !== false);
            if(!st) throw new Error("生徒が見つかりません。");
            const entered=(document.getElementById("studentLoginCode")?.value || "").trim();
            if(st.loginCode && entered !== String(st.loginCode)) throw new Error("ログインコードが違います。");
            session = { role:"student", studentId:id, name:st.name };
          }
          saveSession();
        }
        currentView = role === "teacher" ? "teacher-dashboard" : "student-home";
        render();
      }catch(err){
        console.error(err);
        alert(err?.message || "ログインに失敗しました。");
        btn.disabled=false;
        btn.textContent=original;
      }
    }));
  }

  function renderTeacher(){
    const submitted = state.submissions.filter(s => s.status === "submitted").length;
    const returned = state.submissions.filter(s => s.status === "returned").length;
    const published = state.assignments.filter(a => a.published).length;
    const content = currentView === "teacher-create" ? teacherCreateView() :
      currentView === "teacher-students" ? teacherStudentsView() :
      currentView === "teacher-assignment" ? teacherAssignmentView() :
      currentView === "teacher-review" ? teacherReviewView() : teacherDashboardView(submitted, returned, published);

    root.innerHTML = `
      <div class="app-shell">
        ${topbar()}
        <main class="container">
          <div class="split">
            <aside class="card sidebar">
              <button class="side-link ${currentView === "teacher-dashboard" ? "active" : ""}" data-nav="teacher-dashboard">ダッシュボード</button>
              <button class="side-link ${currentView === "teacher-create" ? "active" : ""}" data-nav="teacher-create">＋ 新しい課題</button>
              <button class="side-link ${currentView === "teacher-students" ? "active" : ""}" data-nav="teacher-students">生徒管理</button>
              <div class="hr"></div>
              <div class="small muted" style="padding:0 12px 8px">課題</div>
              ${state.assignments.map(a => `<button class="side-link ${currentView === "teacher-assignment" && selectedAssignmentId === a.id ? "active" : ""}" data-assignment-nav="${a.id}"><span class="side-subject ${subjectMeta(a.subject).css}">${subjectMeta(a.subject).short}</span>${esc(a.title)}</button>`).join("")}
              <div class="hr"></div>
              <button class="side-link" data-action="export-json">データを書き出す</button>
              <label class="side-link" style="cursor:pointer">データを読み込む<input id="importJson" type="file" accept="application/json" hidden></label>
            </aside>
            <section>${content}</section>
          </div>
        </main>
      </div>`;
    bindTeacher();
  }

  function teacherDashboardView(submitted, returned, published){
    return `
      <div class="hero">
        <div class="card hero-copy">
          <div class="eyebrow">GUCHI HISTORY TEAM</div>
          <h1>日本史も世界史も、論述を短く回す。</h1>
          <p class="muted">PDFから出題し、生徒は手書き答案を写真で提出。日本史・世界史を同じ画面で管理できます。</p>
          <div class="form-actions" style="justify-content:flex-start"><button class="btn" data-nav="teacher-create">新しい課題を作る</button><button class="btn secondary" data-nav="teacher-students">生徒を登録する</button></div>
        </div>
        <div class="card brand-mini-card">
          <img src="assets/guchi-history-hero.webp" alt="GUCHIの歴史添削隊">
          <div class="brand-mini-copy"><h3>今の運用</h3><p class="small muted">${state.mode === "local" ? "この端末内だけで保存。共有運用時はSupabaseに接続します。" : "共有DBに接続されています。"}</p></div>
        </div>
      </div>
      <div class="grid three" style="margin-bottom:18px">
        <div class="card kpi"><span class="muted small">公開中の課題</span><strong>${published}</strong></div>
        <div class="card kpi"><span class="muted small">添削待ち</span><strong>${submitted}</strong></div>
        <div class="card kpi"><span class="muted small">返却済</span><strong>${returned}</strong></div>
      </div>
      <div class="card pad">
        <div class="assignment-head"><h2>提出状況</h2><span class="badge gray">${state.students.filter(st => st.active !== false).length}人</span></div>
        ${state.assignments.map(a => {
          const rows = state.students.filter(st => st.active !== false).map(st => {
            const s = submissionFor(st.id, a.id);
            return `<div class="submission-card"><div class="assignment-head"><div><strong>${esc(st.name)}</strong><div class="small muted">${esc(a.title)}</div></div><div>${statusLabel(s)}</div></div>${s ? `<div class="form-actions"><button class="btn secondary" data-review="${s.id}">${s.status === "returned" ? "返却内容を見る" : "答案を見る"}</button></div>` : ""}</div>`;
          }).join("");
          return `<div style="margin-top:16px"><div class="assignment-title-row">${subjectBadge(a.subject)}<h3>${esc(a.title)}</h3></div>${rows}</div>`;
        }).join("")}
      </div>`;
  }

  function teacherStudentsView(){
    const activeCount = state.students.filter(st => st.active !== false).length;
    return `
      <div class="card pad">
        <div class="eyebrow">Student management</div>
        <div class="assignment-head">
          <div><h1 style="font-size:30px">生徒管理</h1><p class="muted">先生画面から生徒を登録すると、ログイン画面にすぐ反映されます。</p></div>
          <span class="badge gray">利用中 ${activeCount}人</span>
        </div>
        <div class="student-register-box">
          <h2>新しい生徒を登録</h2>
          <form id="studentRegisterForm">
            <div class="grid two">
              <div class="field"><label>生徒名</label><input name="name" required placeholder="例：山田 太郎"></div>
              <div class="field"><label>ログインコード</label><div class="input-with-button"><input id="studentLoginCodeNew" name="loginCode" inputmode="numeric" maxlength="8" placeholder="空欄なら4桁を自動発行"><button class="btn secondary" type="button" data-action="generate-student-code">自動発行</button></div></div>
            </div>
            <div class="field">
              <label>受講科目</label>
              <div class="subject-choice-row">
                <label class="subject-choice japanese"><input type="checkbox" name="subjectJapanese" checked> <span>日本史</span></label>
                <label class="subject-choice world"><input type="checkbox" name="subjectWorld" checked> <span>世界史</span></label>
              </div>
              <div class="small muted" style="margin-top:7px">受講科目に設定した課題だけが、その生徒の一覧に表示されます。</div>
            </div>
            <div class="form-actions"><button class="btn" type="submit">生徒を登録</button></div>
          </form>
        </div>
      </div>
      <div class="card pad" style="margin-top:18px">
        <div class="assignment-head"><h2>登録済み生徒</h2><span class="badge gray">${state.students.length}人</span></div>
        ${state.students.length ? state.students.map(st => {
          const subjects = (st.subjects?.length ? st.subjects : ["japanese","world"]);
          const submissionCount = state.submissions.filter(x => x.studentId === st.id).length;
          return `<div class="student-row ${st.active === false ? "is-inactive" : ""}">
            <div class="student-main">
              <div class="student-name-line"><strong>${esc(st.name)}</strong>${st.active === false ? `<span class="badge gray">利用停止</span>` : `<span class="badge ok">利用中</span>`}</div>
              <div class="pill-row" style="margin-top:8px">${subjects.map(subjectBadge).join("")}<span class="badge gray">提出 ${submissionCount}件</span></div>
              <div class="small muted student-code-line">ログインコード：<span class="code">${esc(st.loginCode || "なし")}</span></div>
            </div>
            <div class="student-actions">
              <button class="btn secondary" data-student-code-regenerate="${st.id}">コード再発行</button>
              <button class="btn secondary" data-student-toggle="${st.id}">${st.active === false ? "利用再開" : "利用停止"}</button>
              ${submissionCount === 0 ? `<button class="btn danger" data-student-delete="${st.id}">削除</button>` : ""}
            </div>
          </div>`;
        }).join("") : `<div class="empty">生徒がまだ登録されていません。</div>`}
      </div>`;
  }

  function teacherCreateView(){
    pendingWorksheetPdfDataUrl = null;
    pendingWorksheetPdfName = "";
    pendingWorksheetPdfStored = false;
    if(pendingWorksheetPdfObjectUrl){ URL.revokeObjectURL(pendingWorksheetPdfObjectUrl); pendingWorksheetPdfObjectUrl = null; }
    return `
      <div class="card pad">
        <div class="eyebrow">New assignment</div>
        <h1 style="font-size:30px">新しい論述課題</h1>
        <div class="pdf-import-panel">
          <div class="capture-step" style="margin-top:0">
            <span class="step-num">1</span>
            <div><h2>いつものプリントPDFをアップ</h2><p class="small muted">AIがタイトル・設問・字数・整理欄・添削基準候補を読み取り、下の課題フォームへ振り分けます。</p></div>
          </div>
          <label class="upload-zone" for="worksheetPdfInput">
            <input id="worksheetPdfInput" type="file" accept="application/pdf,.pdf" hidden>
            <span class="upload-icon pdf-icon">PDF</span>
            <strong>PDFを選ぶ</strong>
            <span class="small muted">今使っているプリントをそのままアップロード</span>
          </label>
          <div id="worksheetPdfSelected" class="pdf-selected"></div>
          <div class="ocr-actions" style="margin-top:12px">
            <button type="button" id="parseWorksheetButton" class="btn" data-action="parse-worksheet" disabled>AIで課題化${CONFIG.worksheetParseEndpoint ? "" : "（デモ）"}</button>
            <span id="worksheetParseStatus" class="small muted">PDFを選ぶと解析できます。</span>
          </div>
          <div id="worksheetPdfPreviewWrap" class="pdf-preview-wrap">
            <iframe id="worksheetPdfPreview" title="アップロードしたプリントPDF"></iframe>
          </div>
        </div>
        <div class="capture-step">
          <span class="step-num">2</span>
          <div><h2>AIが作った内容を先生が微調整</h2><p class="small muted">誤読や採点基準だけ直して公開。AIに丸投げせず、最後は先生が確認する設計です。</p></div>
        </div>
        <form id="assignmentForm">
          <div id="worksheetParseSummary" class="notice info" style="display:none;margin-bottom:16px"></div>
          <div class="field"><label>科目</label><select name="subject"><option value="japanese">日本史</option><option value="world">世界史</option></select></div>
          <div class="grid two">
            <div class="field"><label>課題タイトル</label><input name="title" required placeholder="例：9月第2週 日本史論述演習"></div>
            <div class="field"><label>字数制限</label><input name="limit" type="number" value="50" min="10" max="400"></div>
          </div>
          <div class="field"><label>今週のテーマ</label><input name="theme" placeholder="例：史料から政策の意図を説明する"></div>
          <div class="field"><label>到達目標</label><textarea name="goal"></textarea></div>
          <div class="field"><label>今日の型</label><input name="method" value="設問条件を分解する → 必須要素を置く → 字数内で1文にまとめる"></div>
          <div class="field"><label>出典</label><input name="source"></div>
          <div class="field"><label>問題文</label><textarea name="prompt" required></textarea></div>
          <div class="grid two">
            <div class="field"><label>「答える前に」欄 1</label><input name="before1" value="設問は何を聞いているか"></div>
            <div class="field"><label>「答える前に」欄 2</label><input name="before2" value="時期・地域・人物"></div>
          </div>
          <h3>先生用：必ず入れる要素</h3>
          <p class="small muted">AIがPDFから候補を作ります。生徒には出さず、先生の添削基準として使います。</p>
          <div class="grid three">
            <div class="field"><input name="req1" placeholder="要素1"></div>
            <div class="field"><input name="req2" placeholder="要素2"></div>
            <div class="field"><input name="req3" placeholder="要素3"></div>
          </div>
          <div class="field"><label>答案の流れ（先生用）</label><textarea name="answerFlow"></textarea></div>
          <div class="field"><label>模範解答（先生用・任意）</label><textarea name="teacherModel"></textarea></div>
          <div class="capture-step">
            <span class="step-num">3</span>
            <div><h2>確認して公開</h2><p class="small muted">公開後は生徒がプリントに手書き → 写真 → AI文字起こし → 微調整 → 提出、という流れになります。</p></div>
          </div>
          <div class="form-actions"><button class="btn secondary" type="button" data-nav="teacher-dashboard">キャンセル</button><button class="btn" type="submit">公開して作成</button></div>
        </form>
      </div>`;
  }

  function teacherAssignmentView(){
    const a = assignmentById(selectedAssignmentId) || state.assignments[0];
    if(!a) return `<div class="card empty">課題がありません。</div>`;
    return `
      <div class="card pad">
        <div class="assignment-head">
          <div><div class="eyebrow">Assignment</div><div class="assignment-title-row">${subjectBadge(a.subject)}<h1 style="font-size:30px;margin:0">${esc(a.title)}</h1></div></div>
          <span class="badge ${a.published ? "ok" : "gray"}">${a.published ? "公開中" : "非公開"}</span>
        </div>
        <div class="meta"><span class="badge gray">${a.limit}字以内</span><span class="badge gray">${esc(a.source || "出典未設定")}</span></div>
        <div class="question-box">${nl2br(a.prompt)}</div>
        ${a.worksheetPdfDataUrl ? `<details class="source-pdf"><summary>元のプリントPDFを見る</summary><iframe src="${esc(a.worksheetPdfDataUrl)}" title="${esc(a.worksheetPdfName || a.title)}"></iframe></details>` : ""}
        <div class="hr"></div>
        <h3>添削基準</h3>
        <div class="teacher-rubric">
          ${(a.requiredElements || ["","",""]).map((r,i) => `<div class="rubric-box"><strong>${i+1}.</strong> ${esc(r || "未設定")}</div>`).join("")}
        </div>
        <div class="form-actions"><button class="btn secondary" data-action="toggle-publish" data-id="${a.id}">${a.published ? "非公開にする" : "公開する"}</button><button class="btn danger" data-action="delete-assignment" data-id="${a.id}">削除</button></div>
      </div>
      <div class="card pad" style="margin-top:18px">
        <h2>提出状況</h2>
        ${state.students.filter(st => st.active !== false).map(st => {
          const s = submissionFor(st.id, a.id);
          return `<div class="submission-card"><div class="assignment-head"><div><strong>${esc(st.name)}</strong>${s ? `<div class="small muted">${charCount(s.answer)}字</div>` : ""}</div>${statusLabel(s)}</div>${s ? `<div class="form-actions"><button class="btn secondary" data-review="${s.id}">答案を見る</button></div>` : ""}</div>`;
        }).join("")}
      </div>`;
  }

  function teacherReviewView(){
    const s = state.submissions.find(x => x.id === selectedSubmissionId);
    if(!s) return `<div class="card empty">答案が選択されていません。</div>`;
    const a = assignmentById(s.assignmentId);
    const st = state.students.find(x => x.id === s.studentId);
    const fb = s.feedback || {};
    return `
      <div class="card pad">
        <div class="assignment-head"><div><div class="eyebrow">Review</div><h1 style="font-size:30px">${esc(st.name)}の答案</h1><div class="assignment-title-row">${subjectBadge(a.subject)}<p class="muted" style="margin:0">${esc(a.title)}</p></div></div>${statusLabel(s)}</div>
        <div class="hr"></div>
        <h3>答える前に</h3>
        ${(a.beforeFields || []).map((f,i) => `<div class="field"><label>${esc(f)}</label><div class="answer-preview">${nl2br((s.beforeAnswers || [])[i] || "（未記入）")}</div></div>`).join("")}
        ${s.answerImage ? `<h3>元の手書き答案</h3><div class="teacher-photo-wrap"><img class="teacher-answer-photo" src="${esc(s.answerImage)}" alt="${esc(st.name)}の手書き答案"></div>` : ""}
        ${s.aiTranscriptRaw ? `<h3 style="margin-top:18px">AI読み取り原文</h3><div class="answer-preview">${nl2br(s.aiTranscriptRaw)}</div>` : ""}
        <div class="assignment-head" style="margin-top:18px"><h3>生徒確認後の答案</h3>${s.aiTranscriptRaw && s.aiTranscriptRaw !== s.answer ? `<span class="badge gray">生徒が微調整済み</span>` : ""}</div>
        <div class="answer-preview" style="font-size:18px">${nl2br(s.answer)}</div>
        <div class="counter"><span>${a.limit}字以内</span><span class="count">${charCount(s.answer)}字</span></div>
        <div class="hr"></div>
        <form id="feedbackForm">
          <h3>必須要素チェック</h3>
          <div class="checklist">
            ${(a.requiredElements || ["","",""]).map((r,i) => `<label class="check-item"><input type="checkbox" name="rubric${i}" ${fb.rubric && fb.rubric[i] ? "checked" : ""}><span><strong>${i+1}.</strong> ${esc(r || "未設定の要素")}</span></label>`).join("")}
          </div>
          <div class="field" style="margin-top:18px"><label>先生コメント</label><textarea name="comment" placeholder="良かった点 → 次に直す点 の順で返す">${esc(fb.comment || "")}</textarea></div>
          <div class="field"><label>書き直しのヒント</label><textarea name="rewriteHint" placeholder="答えそのものではなく、次に考える方向を示す">${esc(fb.rewriteHint || "")}</textarea></div>
          <div class="field"><label>模範解答を見せる（任意）</label><textarea name="model">${esc(fb.model || a.teacherModel || "")}</textarea></div>
          <div class="form-actions"><button type="button" class="btn secondary" data-nav="teacher-dashboard">戻る</button><button class="btn" type="submit">返却する</button></div>
        </form>
      </div>`;
  }

  function renderStudent(){
    const content = currentView === "student-assignment" ? studentAssignmentView() : currentView === "student-feedback" ? studentFeedbackView() : studentHomeView();
    root.innerHTML = `<div class="app-shell">${topbar()}<main class="container">${content}</main></div>`;
    bindStudent();
  }

  function studentHomeView(){
    const st = state.students.find(x => x.id === session.studentId);
    const allowedSubjects = st?.subjects?.length ? st.subjects : ["japanese","world"];
    const published = state.assignments.filter(a => a.published && allowedSubjects.includes(a.subject || "japanese"));
    return `
      <div class="hero">
        <div class="card hero-copy">
          <div class="eyebrow">GUCHI HISTORY TEAM</div>
          <h1>${esc(session.name)}さんの歴史論述</h1>
          <p class="muted">日本史・世界史の課題を、手書き → 写真 → AI文字起こし → 確認 → 提出の流れで進めます。</p>
        </div>
        <div class="card pad"><h3>提出の流れ</h3><p class="small muted">①手書き答案を撮影 → ②AI読み取り → ③読み取り結果を微調整 → ④自己点検・提出 → ⑤先生から返却 → ⑥書き直し</p></div>
      </div>
      <h2>今週の課題</h2>
      ${published.length ? published.map(a => {
        const s = submissionFor(session.studentId, a.id);
        return `<div class="card assignment-card subject-card ${subjectMeta(a.subject).css}"><div class="assignment-head"><div>${subjectBadge(a.subject)}<h3 style="margin-top:10px">${esc(a.title)}</h3><p class="muted small">${esc(a.theme || "")}</p></div>${statusLabel(s)}</div><div class="meta"><span class="badge gray">${a.limit}字以内</span><span class="badge gray">${esc(a.source || "")}</span></div><div class="form-actions"><button class="btn" data-student-assignment="${a.id}">${s && s.status === "returned" ? "返却を見る" : s && s.status === "submitted" ? "提出内容を見る" : "取り組む"}</button></div></div>`;
      }).join("") : `<div class="card empty">公開中の課題はありません。</div>`}`;
  }

  function coinDiagram(a){
    if(!a.showCoins) return "";
    return `<div class="coin-row">
      <div class="coin-wrap"><div class="coin"><span class="char top">和</span><span class="char right">開</span><span class="char bottom">珎</span><span class="char left">同</span></div><strong>和同開珎（模式図）</strong><div class="small muted">${esc(a.coinNotes?.wada || "")}</div></div>
      <div class="coin-wrap"><div class="coin"><span class="char top">富</span><span class="char bottom">本</span><div class="dots"><i class="dot d1"></i><i class="dot d2"></i><i class="dot d3"></i><i class="dot d4"></i><i class="dot d5"></i><i class="dot d6"></i><i class="dot d7"></i></div></div><strong>富本銭（模式図）</strong><div class="small muted">${esc(a.coinNotes?.fuhon || "")}</div></div>
    </div>`;
  }

  function studentAssignmentView(){
    const a = assignmentById(selectedAssignmentId);
    if(!a) return `<div class="card empty">課題がありません。</div>`;
    const s = submissionFor(session.studentId, a.id);
    if(s?.status === "returned") { currentView = "student-feedback"; return studentFeedbackView(); }
    const draft = s || { beforeAnswers:["",""], answer:"", aiTranscriptRaw:"", answerImage:"", selfChecks:[false,false,false,false] };
    const locked = s?.status === "submitted";
    pendingPhotoDataUrl = draft.answerImage || null;
    const count = charCount(draft.answer);
    const min = Math.ceil(a.limit * (a.minRatio || .8));
    return `
      <div class="card pad">
        <div class="assignment-head"><div>${subjectBadge(a.subject)}<div class="eyebrow" style="margin-top:10px">${esc(a.title)}</div><h1 style="font-size:30px">${esc(a.theme)}</h1></div>${locked ? `<span class="badge warn">提出済</span>` : ""}</div>
        <div class="grid two" style="margin-top:14px">
          <div><div class="small muted">到達目標</div><p>${esc(a.goal || "")}</p></div>
          <div><div class="small muted">今日の型</div><p>${esc(a.method || "")}</p></div>
        </div>
        <div class="notice">指定字数の8割未満の答案は、内容があっても採点対象にならない可能性があります。最低でも${min}字、できれば9割以上を目安に書きましょう。</div>
        <div class="hr"></div>
        <h2>問題</h2>
        ${a.worksheetPdfDataUrl ? `<details class="source-pdf student-source-pdf"><summary>元のプリントを開く</summary><iframe src="${esc(a.worksheetPdfDataUrl)}" title="${esc(a.worksheetPdfName || a.title)}"></iframe></details>` : ""}
        ${coinDiagram(a)}
        <div class="question-box">${nl2br(a.prompt)}</div>
        <div class="small muted" style="margin-top:8px">出典：${esc(a.source || "")}</div>
        <div class="hr"></div>
        <form id="studentAnswerForm">
          <h2>答えを書く前に</h2>
          ${(a.beforeFields || []).map((f,i) => `<div class="field"><label>${esc(f)}</label><textarea name="before${i}" ${locked ? "disabled" : ""}>${esc((draft.beforeAnswers || [])[i] || "")}</textarea></div>`).join("")}
          <div class="field"><label>必ず入れる要素（自分で3つ置く）</label><div class="grid three"><input name="ownReq0" placeholder="1." value="${esc((draft.ownRequired || [])[0] || "")}" ${locked ? "disabled" : ""}><input name="ownReq1" placeholder="2." value="${esc((draft.ownRequired || [])[1] || "")}" ${locked ? "disabled" : ""}><input name="ownReq2" placeholder="3." value="${esc((draft.ownRequired || [])[2] || "")}" ${locked ? "disabled" : ""}></div></div>
          <div class="field"><label>答案の流れ</label><textarea name="ownFlow" ${locked ? "disabled" : ""}>${esc(draft.ownFlow || "")}</textarea></div>
          <div class="capture-panel">
            <div class="capture-step">
              <span class="step-num">1</span>
              <div><h2>手書き答案を撮影</h2><p class="small muted">プリント全体ではなく、答案欄が大きく写るように撮ると読み取りやすくなります。</p></div>
            </div>
            ${locked ? "" : `<label class="upload-zone" for="answerPhotoInput"><input id="answerPhotoInput" type="file" accept="image/*" capture="environment" hidden><span class="upload-icon">▣</span><strong>${draft.answerImage ? "写真を撮り直す / 選び直す" : "カメラで撮る / 写真を選ぶ"}</strong><span class="small muted">JPG / PNG</span></label>`}
            <div id="photoPreviewWrap" class="photo-preview-wrap ${draft.answerImage ? "show" : ""}">
              <img id="answerPhotoPreview" class="answer-photo" src="${esc(draft.answerImage || "")}" alt="手書き答案の写真">
              ${locked ? "" : `<button type="button" class="btn secondary small-btn" data-action="remove-photo">写真を外す</button>`}
            </div>

            <div class="capture-step">
              <span class="step-num">2</span>
              <div><h2>AIで文字を読み取る</h2><p class="small muted">AIはここでは添削せず、手書き文字の文字起こしだけを行います。</p></div>
            </div>
            ${locked ? "" : `<div class="ocr-actions"><button type="button" id="runOcrButton" class="btn" data-action="run-ocr" ${draft.answerImage ? "" : "disabled"}>AIで文字を読み取る${CONFIG.ocrEndpoint ? "" : "（デモ）"}</button><span id="ocrStatus" class="small muted">${CONFIG.ocrEndpoint ? "写真を選ぶと読み取りできます。" : "API未接続のため、現在は読み取りフローのデモです。"}</span></div>`}
            <input type="hidden" id="aiTranscriptRawInput" name="aiTranscriptRaw" value="${esc(draft.aiTranscriptRaw || "")}">
            <div id="rawTranscriptWrap" class="raw-transcript ${draft.aiTranscriptRaw ? "show" : ""}">
              <div class="small muted">AI読み取り原文</div>
              <div id="aiRawTranscript" class="answer-preview">${nl2br(draft.aiTranscriptRaw || "")}</div>
            </div>

            <div class="capture-step">
              <span class="step-num">3</span>
              <div><h2>読み取り結果を確認・微調整</h2><p class="small muted">AIの誤認識だけ直してください。先生には元の写真・AI原文・確認後の文章がすべて残ります。</p></div>
            </div>
            <textarea id="studentAnswer" name="answer" ${locked ? "disabled" : ""} style="min-height:140px;font-size:17px" placeholder="AI読み取り後の文章がここに入ります。必要な箇所だけ修正してください。">${esc(draft.answer || "")}</textarea>
            <div class="counter"><span>最低目安 ${min}字 / 上限 ${a.limit}字</span><span id="charCount" class="count ${count > a.limit ? "over" : ""}">${count}字</span></div>
            <div class="progress"><span id="charProgress" style="width:${Math.min(100, count / a.limit * 100)}%"></span></div>
          </div>
          <div class="hr"></div>
          <h2>自己点検</h2>
          <div class="checklist">
            ${["設問で聞かれていることに答えている","必要な要素を落としていない","比較または因果関係が見える","指定字数の8割以上を書いている"].map((t,i) => `<label class="check-item"><input type="checkbox" name="self${i}" ${(draft.selfChecks || [])[i] ? "checked" : ""} ${locked ? "disabled" : ""}><span>${t}</span></label>`).join("")}
          </div>
          <div class="form-actions"><button type="button" class="btn secondary" data-nav="student-home">一覧へ</button>${locked ? `<span class="badge warn">先生の返却を待っています</span>` : `<button class="btn secondary" type="button" data-action="save-draft">下書き保存</button><button class="btn" type="submit">先生に提出</button>`}</div>
        </form>
      </div>`;
  }

  function studentFeedbackView(){
    const a = assignmentById(selectedAssignmentId);
    const s = submissionFor(session.studentId, a.id);
    if(!s) return `<div class="card empty">返却データがありません。</div>`;
    if(s.status !== "returned") return studentAssignmentView();
    const fb = s.feedback || {};
    return `
      <div class="card pad">
        <div class="assignment-head"><div><div class="eyebrow">Returned</div><h1 style="font-size:30px">先生から返却されました</h1><p class="muted">${esc(a.title)}</p></div><span class="badge ok">返却済</span></div>
        <div class="hr"></div>
        ${s.answerImage ? `<h3>提出した手書き答案</h3><div class="teacher-photo-wrap"><img class="teacher-answer-photo" src="${esc(s.answerImage)}" alt="提出した手書き答案"></div>` : ""}
        <h3 style="margin-top:18px">確認して提出した答案</h3><div class="answer-preview" style="font-size:18px">${nl2br(s.answer)}</div>
        <div class="counter"><span>${a.limit}字以内</span><span class="count">${charCount(s.answer)}字</span></div>
        <div class="hr"></div>
        <h3>先生チェック</h3>
        <div class="teacher-rubric">${(a.requiredElements || ["","",""]).map((r,i) => `<div class="rubric-box">${fb.rubric?.[i] ? "✓" : "△"} ${esc(r || `要素${i+1}`)}</div>`).join("")}</div>
        <div class="field" style="margin-top:18px"><label>先生コメント</label><div class="answer-preview">${nl2br(fb.comment || "")}</div></div>
        <div class="field"><label>書き直しのヒント</label><div class="answer-preview">${nl2br(fb.rewriteHint || "")}</div></div>
        ${fb.model ? `<div class="field"><label>模範解答</label><div class="answer-preview">${nl2br(fb.model)}</div></div>` : ""}
        <div class="hr"></div>
        <h2>書き直し</h2>
        <form id="rewriteForm"><textarea name="rewrite" style="min-height:140px;font-size:17px">${esc(s.rewrite || "")}</textarea><div class="counter"><span>${a.limit}字以内</span><span id="rewriteCount" class="count">${charCount(s.rewrite || "")}字</span></div><div class="form-actions"><button type="button" class="btn secondary" data-nav="student-home">一覧へ</button><button class="btn" type="submit">書き直しを提出</button></div></form>
      </div>`;
  }

  function bindCommon(){
    root.querySelectorAll("[data-action='logout']").forEach(el => el.addEventListener("click", async () => {
      if(HAS_SUPABASE){ try{ await db.auth.signOut(); }catch(err){ console.warn(err); } }
      session=null; saveSession(); currentView="login";
      if(HAS_SUPABASE) state=normalizeState(structuredClone(initialState));
      render();
    }));
    root.querySelectorAll("[data-nav]").forEach(el => el.addEventListener("click", () => { currentView = el.dataset.nav; render(); }));
  }

  function bindTeacher(){
    bindCommon();
    const studentRegisterForm = document.getElementById("studentRegisterForm");
    root.querySelectorAll("[data-action='generate-student-code']").forEach(el => el.addEventListener("click", () => {
      const input=document.getElementById("studentLoginCodeNew"); if(input) input.value=randomLoginCode();
    }));
    if(studentRegisterForm) studentRegisterForm.addEventListener("submit", e => {
      e.preventDefault();
      const fd=new FormData(studentRegisterForm);
      const name=String(fd.get("name") || "").trim();
      if(!name){ alert("生徒名を入力してください。"); return; }
      const subjects=[]; if(fd.get("subjectJapanese") === "on") subjects.push("japanese"); if(fd.get("subjectWorld") === "on") subjects.push("world");
      if(!subjects.length){ alert("日本史・世界史のどちらかを選んでください。"); return; }
      const loginCode=String(fd.get("loginCode") || "").trim() || randomLoginCode();
      if(state.students.some(st => st.active !== false && st.loginCode && st.loginCode === loginCode)){ alert("同じログインコードが使われています。別のコードにしてください。"); return; }
      state.students.push({ id:uid("student"), name, loginCode, subjects, active:true, createdAt:new Date().toISOString() });
      saveState(); alert(`${name}さんを登録しました。ログインコード：${loginCode}`); currentView="teacher-students"; render();
    });
    root.querySelectorAll("[data-student-code-regenerate]").forEach(el => el.addEventListener("click", () => {
      const st=state.students.find(x => x.id === el.dataset.studentCodeRegenerate); if(!st) return;
      let code=randomLoginCode(); while(state.students.some(x => x.id !== st.id && x.loginCode === code)) code=randomLoginCode();
      st.loginCode=code; saveState(); alert(`${st.name}さんの新しいログインコード：${code}`); render();
    }));
    root.querySelectorAll("[data-student-toggle]").forEach(el => el.addEventListener("click", () => {
      const st=state.students.find(x => x.id === el.dataset.studentToggle); if(!st) return; st.active = st.active === false ? true : false; saveState(); render();
    }));
    root.querySelectorAll("[data-student-delete]").forEach(el => el.addEventListener("click", async () => {
      const st=state.students.find(x => x.id === el.dataset.studentDelete); if(!st) return;
      if(state.submissions.some(x => x.studentId === st.id)){ alert("提出履歴があるため削除できません。利用停止にしてください。"); return; }
      if(confirm(`${st.name}さんを削除しますか？`)){
        try{
          if(HAS_SUPABASE) await deleteRemoteStudent(st.id);
          state.students=state.students.filter(x => x.id !== st.id);
          if(!HAS_SUPABASE) await saveState();
          render();
        }catch(err){ console.error(err); alert(err?.message || "生徒を削除できませんでした。"); }
      }
    }));
    root.querySelectorAll("[data-assignment-nav]").forEach(el => el.addEventListener("click", () => { selectedAssignmentId = el.dataset.assignmentNav; currentView="teacher-assignment"; render(); }));
    root.querySelectorAll("[data-review]").forEach(el => el.addEventListener("click", () => { selectedSubmissionId = el.dataset.review; currentView="teacher-review"; render(); }));
    const form = document.getElementById("assignmentForm");
    const worksheetPdfInput = document.getElementById("worksheetPdfInput");
    const parseWorksheetButton = document.getElementById("parseWorksheetButton");
    const worksheetParseStatus = document.getElementById("worksheetParseStatus");
    const fillAssignmentForm = (data) => {
      if(!form) return;
      const set = (name, value) => { const el=form.elements[name]; if(el && value !== undefined && value !== null) el.value=value; };
      set("subject", data.subject || (/世界史/.test(data.title || "") ? "world" : "japanese"));
      set("title", data.title || "");
      set("limit", data.limit || 50);
      set("theme", data.theme || "");
      set("goal", data.goal || "");
      set("method", data.method || "設問条件を分解する → 必須要素を置く → 字数内で1文にまとめる");
      set("source", data.source || "");
      set("prompt", data.prompt || "");
      set("before1", (data.beforeFields || [])[0] || "設問は何を聞いているか");
      set("before2", (data.beforeFields || [])[1] || "時期・地域・人物");
      set("req1", (data.requiredElements || [])[0] || "");
      set("req2", (data.requiredElements || [])[1] || "");
      set("req3", (data.requiredElements || [])[2] || "");
      set("answerFlow", data.answerFlow || "");
      set("teacherModel", data.teacherModel || "");
      const summary = document.getElementById("worksheetParseSummary");
      if(summary){ summary.style.display="block"; summary.textContent=(data.demo ? "デモ解析：" : "AI解析完了：") + (data.summary || "PDFの内容を課題フォームへ反映しました。先生が確認してから公開してください。"); }
    };
    const runWorksheetParse = async () => {
      if(!pendingWorksheetPdfDataUrl || !worksheetPdfInput?.files?.[0]){ alert("先にPDFを選んでください。"); return; }
      const file = worksheetPdfInput.files[0];
      if(parseWorksheetButton){ parseWorksheetButton.disabled=true; parseWorksheetButton.textContent="解析中…"; }
      if(worksheetParseStatus) worksheetParseStatus.textContent="PDFの設問・字数・欄構成を読み取っています…";
      try{
        const data = await parseWorksheetPdf(pendingWorksheetPdfDataUrl, file);
        fillAssignmentForm(data);
        if(worksheetParseStatus) worksheetParseStatus.textContent = data.demo ? "デモ解析完了。下の自動入力内容を確認・修正してください。" : "解析完了。下の自動入力内容を確認・修正してください。";
        form?.scrollIntoView({behavior:"smooth",block:"start"});
      }catch(err){
        console.error(err);
        if(worksheetParseStatus) worksheetParseStatus.textContent="解析に失敗しました。PDFを選び直すか、手入力してください。";
        alert("PDFのAI解析に失敗しました。");
      }finally{
        if(parseWorksheetButton){ parseWorksheetButton.disabled=false; parseWorksheetButton.textContent=`AIで課題化${CONFIG.worksheetParseEndpoint ? "" : "（デモ）"}`; }
      }
    };
    if(worksheetPdfInput) worksheetPdfInput.addEventListener("change", async () => {
      const file = worksheetPdfInput.files?.[0];
      if(!file) return;
      if(file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)){ alert("PDFファイルを選んでください。"); return; }
      if(pendingWorksheetPdfObjectUrl) URL.revokeObjectURL(pendingWorksheetPdfObjectUrl);
      pendingWorksheetPdfObjectUrl = URL.createObjectURL(file);
      pendingWorksheetPdfName = file.name;
      pendingWorksheetPdfDataUrl = await fileToDataUrl(file);
      // Supabase共有モードではStorageへ保存。ローカルデモだけ容量節約のため約1.8MB以下に制限。
      pendingWorksheetPdfStored = HAS_SUPABASE || file.size <= 1800000;
      const selected = document.getElementById("worksheetPdfSelected");
      if(selected) selected.innerHTML=`<strong>${esc(file.name)}</strong><span class="small muted">${(file.size/1024/1024).toFixed(2)} MB</span>${pendingWorksheetPdfStored ? `<span class="badge ok">${HAS_SUPABASE ? "Supabase Storageに保存" : "原本も課題に保存"}</span>` : `<span class="badge warn">デモでは原本保存なし</span>`}`;
      const wrap = document.getElementById("worksheetPdfPreviewWrap");
      const iframe = document.getElementById("worksheetPdfPreview");
      if(iframe) iframe.src=pendingWorksheetPdfObjectUrl;
      if(wrap) wrap.classList.add("show");
      if(parseWorksheetButton) parseWorksheetButton.disabled=false;
      if(worksheetParseStatus) worksheetParseStatus.textContent=pendingWorksheetPdfStored ? (HAS_SUPABASE ? "PDFを選択しました。公開時にSupabase Storageへ保存します。" : "PDFを選択しました。AI解析できます。") : "PDFは解析できますが、デモ保存容量の都合で原本PDFは課題に残しません。本番ではStorageに保存します。";
      await runWorksheetParse();
    });
    root.querySelectorAll("[data-action='parse-worksheet']").forEach(el => el.addEventListener("click", runWorksheetParse));
    if(form) form.addEventListener("submit", e => {
      e.preventDefault();
      const fd = new FormData(form);
      const a = {
        id:uid("assignment"), subject:fd.get("subject") || "japanese", title:fd.get("title"), limit:Number(fd.get("limit")||50), theme:fd.get("theme"), goal:fd.get("goal"), method:fd.get("method"), source:fd.get("source"), prompt:fd.get("prompt"), minRatio:.8, showCoins:false,
        beforeFields:[fd.get("before1"),fd.get("before2")], requiredElements:[fd.get("req1"),fd.get("req2"),fd.get("req3")], answerFlow:fd.get("answerFlow"), teacherModel:fd.get("teacherModel"),
        worksheetPdfName:pendingWorksheetPdfName || "", worksheetPdfDataUrl:pendingWorksheetPdfStored ? (pendingWorksheetPdfDataUrl || "") : "",
        published:true, createdAt:new Date().toISOString()
      };
      state.assignments.unshift(a); saveState(); selectedAssignmentId=a.id; currentView="teacher-assignment"; render();
    });
    const fb = document.getElementById("feedbackForm");
    if(fb) fb.addEventListener("submit", e => {
      e.preventDefault();
      const s = state.submissions.find(x => x.id === selectedSubmissionId); if(!s) return;
      const fd = new FormData(fb);
      s.feedback = { rubric:[0,1,2].map(i => fd.get(`rubric${i}`)==="on"), comment:fd.get("comment"), rewriteHint:fd.get("rewriteHint"), model:fd.get("model") };
      s.status="returned"; s.returnedAt=new Date().toISOString(); saveState(); currentView="teacher-dashboard"; render();
    });
    root.querySelectorAll("[data-action='toggle-publish']").forEach(el => el.addEventListener("click", () => { const a=assignmentById(el.dataset.id); if(a){a.published=!a.published; saveState(); render();} }));
    root.querySelectorAll("[data-action='delete-assignment']").forEach(el => el.addEventListener("click", async () => {
      if(!HAS_SUPABASE && state.assignments.length <= 1){ alert("デモ課題が1件だけなので削除できません。"); return; }
      if(confirm("この課題を削除しますか？")){
        const id=el.dataset.id;
        try{
          if(HAS_SUPABASE) await deleteRemoteAssignment(id);
          state.assignments=state.assignments.filter(a=>a.id!==id);
          state.submissions=state.submissions.filter(s=>s.assignmentId!==id);
          if(!HAS_SUPABASE) await saveState();
          selectedAssignmentId=state.assignments[0]?.id || null;
          currentView="teacher-dashboard";
          render();
        }catch(err){ console.error(err); alert(err?.message || "課題を削除できませんでした。"); }
      }
    }));
    root.querySelectorAll("[data-action='export-json']").forEach(el => el.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="history-writing-data.json"; a.click(); URL.revokeObjectURL(url);
    }));
    const imp = document.getElementById("importJson");
    if(imp) imp.addEventListener("change", async () => { const file=imp.files?.[0]; if(!file) return; try{ const parsed=JSON.parse(await file.text()); if(!parsed.assignments || !parsed.students) throw new Error(); state=normalizeState(parsed); saveState(); alert("読み込みました"); render(); }catch{ alert("JSONを読み込めませんでした"); } });
  }

  function bindStudent(){
    bindCommon();
    root.querySelectorAll("[data-student-assignment]").forEach(el => el.addEventListener("click", () => { selectedAssignmentId=el.dataset.studentAssignment; const s=submissionFor(session.studentId,selectedAssignmentId); currentView=s?.status==="returned"?"student-feedback":"student-assignment"; render(); }));
    const answer = document.getElementById("studentAnswer");
    if(answer) answer.addEventListener("input", () => {
      const a=assignmentById(selectedAssignmentId); const n=charCount(answer.value); const count=document.getElementById("charCount"); count.textContent=`${n}字`; count.classList.toggle("over",n>a.limit); document.getElementById("charProgress").style.width=`${Math.min(100,n/a.limit*100)}%`;
    });
    const form = document.getElementById("studentAnswerForm");
    const collectDraft = (status) => {
      const a=assignmentById(selectedAssignmentId); const fd=new FormData(form); const answerText=fd.get("answer")||""; const n=charCount(answerText);
      if(status==="submitted" && n>a.limit){ alert(`${a.limit}字を超えています。`); return false; }
      if(status==="submitted" && !pendingPhotoDataUrl){ alert("手書き答案の写真を撮影または選択してください。"); return false; }
      if(status==="submitted" && n===0){ alert("AI読み取り結果を確認し、提出する文章を入力してください。"); return false; }
      let s=submissionFor(session.studentId,a.id);
      if(!s){ s={id:uid("submission"),studentId:session.studentId,assignmentId:a.id}; state.submissions.push(s); }
      s.beforeAnswers=(a.beforeFields||[]).map((_,i)=>fd.get(`before${i}`)||"");
      s.ownRequired=[0,1,2].map(i=>fd.get(`ownReq${i}`)||"");
      s.ownFlow=fd.get("ownFlow")||"";
      s.answerImage=pendingPhotoDataUrl || s.answerImage || "";
      s.aiTranscriptRaw=fd.get("aiTranscriptRaw") || s.aiTranscriptRaw || "";
      s.answer=answerText;
      s.selfChecks=[0,1,2,3].map(i=>fd.get(`self${i}`)==="on");
      s.status=status; s.updatedAt=new Date().toISOString(); if(status==="submitted") s.submittedAt=new Date().toISOString();
      saveState(); return true;
    };

    const photoInput = document.getElementById("answerPhotoInput");
    const runOcrButton = document.getElementById("runOcrButton");
    const runOcr = async () => {
      const a = assignmentById(selectedAssignmentId);
      if(!pendingPhotoDataUrl){ alert("先に手書き答案の写真を選んでください。"); return; }
      const status = document.getElementById("ocrStatus");
      if(runOcrButton){ runOcrButton.disabled = true; runOcrButton.textContent = "読み取り中…"; }
      if(status) status.textContent = "手書き文字を読み取っています…";
      try{
        const result = await transcribeAnswerImage(pendingPhotoDataUrl, a);
        const hidden = document.getElementById("aiTranscriptRawInput");
        const raw = document.getElementById("aiRawTranscript");
        const wrap = document.getElementById("rawTranscriptWrap");
        const answerBox = document.getElementById("studentAnswer");
        if(hidden) hidden.value = result.text;
        if(raw) raw.textContent = result.text;
        if(wrap) wrap.classList.add("show");
        if(answerBox){
          answerBox.value = result.text;
          answerBox.dispatchEvent(new Event("input", {bubbles:true}));
        }
        if(status) status.textContent = result.demo ? "デモ読み取りです。実際の写真解析はAPI接続後に有効になります。" : "読み取り完了。下の文章を確認してください。";
        if(form) collectDraft("draft");
      }catch(err){
        console.error(err);
        if(status) status.textContent = "読み取りに失敗しました。写真を撮り直すか、文章を直接修正してください。";
        alert("AI読み取りに失敗しました。");
      }finally{
        if(runOcrButton){ runOcrButton.disabled = false; runOcrButton.textContent = `AIで文字を読み取る${CONFIG.ocrEndpoint ? "" : "（デモ）"}`; }
      }
    };

    if(photoInput) photoInput.addEventListener("change", async () => {
      const file = photoInput.files?.[0];
      if(!file) return;
      if(!file.type.startsWith("image/")){ alert("画像ファイルを選んでください。"); return; }
      const status = document.getElementById("ocrStatus");
      if(status) status.textContent = "写真を準備しています…";
      try{
        pendingPhotoDataUrl = await compressImageFile(file);
        const img = document.getElementById("answerPhotoPreview");
        const wrap = document.getElementById("photoPreviewWrap");
        const hidden = document.getElementById("aiTranscriptRawInput");
        const rawWrap = document.getElementById("rawTranscriptWrap");
        const answerBox = document.getElementById("studentAnswer");
        if(img) img.src = pendingPhotoDataUrl;
        if(wrap) wrap.classList.add("show");
        if(hidden) hidden.value = "";
        if(rawWrap) rawWrap.classList.remove("show");
        if(answerBox){ answerBox.value = ""; answerBox.dispatchEvent(new Event("input", {bubbles:true})); }
        if(runOcrButton) runOcrButton.disabled = false;
        const existing = submissionFor(session.studentId, selectedAssignmentId);
        if(existing) existing.aiTranscriptRaw = "";
        if(form) collectDraft("draft");
        await runOcr();
      }catch(err){
        console.error(err);
        alert("写真を読み込めませんでした。別の写真を選んでください。");
      }
    });

    root.querySelectorAll("[data-action='run-ocr']").forEach(el => el.addEventListener("click", runOcr));
    root.querySelectorAll("[data-action='remove-photo']").forEach(el => el.addEventListener("click", () => {
      pendingPhotoDataUrl = null;
      const existing = submissionFor(session.studentId, selectedAssignmentId);
      if(existing){ existing.answerImage = ""; existing.answerImagePath = ""; existing.aiTranscriptRaw = ""; }
      const img = document.getElementById("answerPhotoPreview"); if(img) img.src = "";
      const wrap = document.getElementById("photoPreviewWrap"); if(wrap) wrap.classList.remove("show");
      const hidden = document.getElementById("aiTranscriptRawInput"); if(hidden) hidden.value = "";
      const rawWrap = document.getElementById("rawTranscriptWrap"); if(rawWrap) rawWrap.classList.remove("show");
      const answerBox = document.getElementById("studentAnswer"); if(answerBox){ answerBox.value=""; answerBox.dispatchEvent(new Event("input", {bubbles:true})); }
      if(runOcrButton) runOcrButton.disabled = true;
      if(form) collectDraft("draft");
    }));

    if(form) form.addEventListener("submit", e => { e.preventDefault(); if(collectDraft("submitted")){ alert("提出しました。先生の返却を待ってください。"); currentView="student-home"; render(); } });
    root.querySelectorAll("[data-action='save-draft']").forEach(el => el.addEventListener("click", () => { if(collectDraft("draft")){ alert("下書きを保存しました。") } }));
    const rewrite = document.getElementById("rewriteForm");
    if(rewrite){
      const ta=rewrite.elements.rewrite; ta.addEventListener("input",()=>{ document.getElementById("rewriteCount").textContent=`${charCount(ta.value)}字`; });
      rewrite.addEventListener("submit", e => { e.preventDefault(); const a=assignmentById(selectedAssignmentId); if(charCount(ta.value)>a.limit){ alert(`${a.limit}字を超えています。`); return; } const s=submissionFor(session.studentId,a.id); s.rewrite=ta.value; s.rewriteSubmittedAt=new Date().toISOString(); s.status="submitted"; saveState(); alert("書き直しを提出しました。"); currentView="student-home"; render(); });
    }
  }

  async function init(){
    if(HAS_SUPABASE){
      root.innerHTML=`<div class="app-shell"><div class="container"><div class="card pad" style="max-width:520px;margin:80px auto;text-align:center"><h2>GUCHIの歴史添削隊</h2><p class="muted">共有データを読み込んでいます…</p></div></div></div>`;
      try{
        await restoreSupabaseSession();
      }catch(err){
        console.error("Supabase init failed",err);
        session=null; saveSession();
        try{ await db.auth.signOut(); }catch{}
        alert(`Supabaseの読み込みに失敗しました。設定を確認してください。
${err?.message || err}`);
      }
    }
    currentView = session ? (session.role === "teacher" ? "teacher-dashboard" : "student-home") : "login";
    render();
  }

  init();
})();
