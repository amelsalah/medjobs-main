// ====== UI helpers ======
    const STORAGE_KEY = "medjobs_user_v1";
    let authMode = "signin"; // signin | signup
    let selectedJob = null;

    const el = (id) => document.getElementById(id);

    function toast(msg){
      // simple alert for now; can replace with a toast UI if you want
      alert(msg);
    }

    // ====== Filters toggle (JobListing.tsx-like) ======
    const filtersForm = el("filtersForm");
    el("toggleFiltersBtn").addEventListener("click", () => {
      const show = filtersForm.style.display !== "flex";
      filtersForm.style.display = show ? "flex" : "none";
    });

    // Search clear button
    const qInput = el("qInput");
    const clearBtn = el("clearSearchBtn");
    function syncClearBtn(){
      clearBtn.style.display = (qInput.value || "").trim() ? "inline-flex" : "none";
    }
    qInput.addEventListener("input", syncClearBtn);
    clearBtn.addEventListener("click", () => {
      qInput.value = "";
      syncClearBtn();
      el("searchForm").submit();
    });
    syncClearBtn();

    // ====== Auth state (Header.tsx-like) ======
    function getUser(){
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
      catch(e){ return null; }
    }
    function setUser(u){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      renderUser();
    }
    function clearUser(){
      localStorage.removeItem(STORAGE_KEY);
      renderUser();
    }

    function renderUser(){
      const user = getUser();
      const userCard = el("userCard");
      const openAuthBtn = el("openAuthBtn");
      const signOutBtn = el("signOutBtn");
      const userName = el("userName");
      const userResume = el("userResume");

      if(user){
        userCard.style.display = "flex";
        openAuthBtn.style.display = "none";
        signOutBtn.style.display = "inline-flex";
        userName.textContent = user.name || "User";

        if(user.resumeFileName){
          userResume.style.display = "block";
          userResume.textContent = "Resume: " + user.resumeFileName;
        } else {
          userResume.style.display = "none";
        }
      }else{
        userCard.style.display = "none";
        openAuthBtn.style.display = "inline-flex";
        signOutBtn.style.display = "none";
      }

      // update job modal apply button text
      syncApplyButtonText();
    }

    el("openAuthBtn").addEventListener("click", () => openAuthModal("signin"));
    el("signOutBtn").addEventListener("click", () => {
      clearUser();
      toast("You have been signed out successfully.");
    });

    // ====== Auth modal (AuthModal.tsx-like) ======
    function openAuthModal(mode){
      authMode = mode || "signin";
      setAuthModeUI();
      el("authModal").style.display = "flex";
      clearAuthErrors();
    }
    function closeAuthModal(){
      el("authModal").style.display = "none";
    }
    function toggleAuthMode(){
      authMode = (authMode === "signin") ? "signup" : "signin";
      setAuthModeUI();
      clearAuthErrors();
    }

    function setAuthModeUI(){
      const isSignUp = authMode === "signup";
      el("authTitle").textContent = isSignUp ? "Sign up" : "Sign in";
      el("authSwitchText").textContent = isSignUp ? "Already have an account? " : "Don't have an account yet? ";
      el("authSwitchBtn").textContent = isSignUp ? "Sign in" : "Sign up";
      el("googleBtnText").textContent = isSignUp ? "Sign up with google" : "Sign in with google";
      el("submitBtnText").textContent = isSignUp ? "Create Account" : "Sign in";

      el("nameRow").style.display = isSignUp ? "flex" : "none";
      el("resumeRow").style.display = isSignUp ? "flex" : "none";
      el("rememberRow").style.display = isSignUp ? "none" : "flex";
    }

    function clearAuthErrors(){
      ["errName","errEmail","errPassword","errResume"].forEach(id => {
        el(id).style.display = "none";
        el(id).textContent = "";
      });
      ["authName","authEmail","authPassword"].forEach(id => el(id).classList.remove("error"));
      el("uploadBox").classList.remove("error");
    }

    function onResumeChange(e){
      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      el("resumeLabel").textContent = f ? f.name : "Choose file or drag & drop";
    }

    function validateEmail(v){
      return /\S+@\S+\.\S+/.test(v);
    }

    function submitAuth(e){
      e.preventDefault();
      clearAuthErrors();

      const isSignUp = authMode === "signup";
      const name = (el("authName").value || "").trim();
      const email = (el("authEmail").value || "").trim();
      const password = (el("authPassword").value || "");
      const resume = el("authResume").files && el("authResume").files[0] ? el("authResume").files[0] : null;

      let ok = true;

      if(isSignUp && !name){
        ok = false;
        el("errName").style.display = "block";
        el("errName").textContent = "Name is required";
        el("authName").classList.add("error");
      }

      if(!email){
        ok = false;
        el("errEmail").style.display = "block";
        el("errEmail").textContent = "Email is required";
        el("authEmail").classList.add("error");
      } else if(!validateEmail(email)){
        ok = false;
        el("errEmail").style.display = "block";
        el("errEmail").textContent = "Email is invalid";
        el("authEmail").classList.add("error");
      }

      if(!password){
        ok = false;
        el("errPassword").style.display = "block";
        el("errPassword").textContent = "Password is required";
        el("authPassword").classList.add("error");
      } else if(isSignUp && password.length < 6){
        ok = false;
        el("errPassword").style.display = "block";
        el("errPassword").textContent = "Password must be at least 6 characters";
        el("authPassword").classList.add("error");
      }

      if(isSignUp){
        if(!resume){
          ok = false;
          el("errResume").style.display = "block";
          el("errResume").textContent = "Please upload your resume";
          el("uploadBox").classList.add("error");
        } else {
          const validTypes = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
          if(!validTypes.includes(resume.type)){
            ok = false;
            el("errResume").style.display = "block";
            el("errResume").textContent = "Please upload a PDF or Word document";
            el("uploadBox").classList.add("error");
          }
        }
      }

      if(!ok) return;

      // Simulate success (like React)
      setUser({
        name: isSignUp ? name : (email.split("@")[0] || "User"),
        email: email,
        resumeFileName: resume ? resume.name : undefined,
      });

      closeAuthModal();
      toast("Welcome! You are signed in.");

      // If user was trying to apply, continue
      if(selectedJob){
        applyToJob();
      }
    }

    // close modals on backdrop click
    el("authModal").addEventListener("click", (ev) => { if(ev.target === el("authModal")) closeAuthModal(); });
    el("jobModal").addEventListener("click", (ev) => { if(ev.target === el("jobModal")) closeJobModal(); });
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape"){
        closeAuthModal();
        closeJobModal();
      }
    });

    // ====== Job modal (JobDetailModal.tsx-like) ======
    function openJobModal(cardEl, directApply){
      const title = cardEl.dataset.title || "";
      const facility = cardEl.dataset.facility || "";
      const location = cardEl.dataset.location || "";
      const date = cardEl.dataset.date || "";
      const url = cardEl.dataset.url || "#";
      const desc = cardEl.dataset.description || "Job details are available on the facility website.";
      const salary = cardEl.dataset.salary || "";

      selectedJob = { title, facility, location, date, url, desc, salary };

      el("mJobTitle").textContent = title;
      el("mFacility").textContent = facility;

      // Your Django data doesn't have facilityWebsite. We use job_url for both links.
      el("mFacilityLink").href = url;
      el("visitLink").href = url;

      el("mLocation").textContent = location;
      el("mDate").textContent = "Posted: " + date;
      el("mDesc").textContent = desc;

      if(salary){
        el("salaryRow").style.display = "flex";
        el("mSalary").textContent = salary;
      } else {
        el("salaryRow").style.display = "none";
      }

      // hide req/benefits blocks (you can enable later when your DB has them)
      el("reqBlock").style.display = "none";
      el("benBlock").style.display = "none";

      el("jobModal").style.display = "flex";
      syncApplyButtonText();

      if(directApply){
        // if user clicks Apply Now on card, we keep modal open and let them hit apply,
        // or you can auto-run applyToJob() if you prefer.
      }
    }

    function closeJobModal(){
      el("jobModal").style.display = "none";
      selectedJob = null;
    }

    function syncApplyButtonText(){
      const user = getUser();
      el("applyBtnText").textContent = user ? "Apply to This Job" : "Sign In to Apply";
      el("signinHint").style.display = user ? "none" : "block";
    }

    function applyToJob(){
      if(!selectedJob) return;
      const user = getUser();
      if(!user){
        openAuthModal("signin");
        return;
      }
      toast(`Application submitted for ${selectedJob.title} at ${selectedJob.facility}!`);
      if(selectedJob.url && selectedJob.url !== "#"){
        window.open(selectedJob.url, "_blank", "noopener");
      }
      closeJobModal();
    }

    // init
    renderUser();
    setAuthModeUI();
