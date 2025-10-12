Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 8 additions and 8 removals
        63            setIsPasswordChanging(true);
        64 
        65            if (!currentPassword || !newPassword || !confirmPassword) {
        66 -              setPasswordMessage({ type: 'error', text: 'يرجى ملء جميع الحقول.'
           -   });
        66 +              setPasswordMessage({ type: 'error', text: t('profile.
           +  validation.fillAllFields') });
        67                setIsPasswordChanging(false);
        68                return;
        69            }
        70            if (newPassword !== confirmPassword) {
        71 -              setPasswordMessage({ type: 'error', text: '
           -  كلمة المرور الجديدة وتأكيدها غير متطابقين.' });
        71 +              setPasswordMessage({ type: 'error', text: t('profile.
           +  messages.passwordMismatch') });
        72                setIsPasswordChanging(false);
        73                return;
        74            }
        75            if (newPassword.length < 6) {
        76 -               setPasswordMessage({ type: 'error', text: 'يجب أن تكون كلمة المرور        
           - الجديدة 6 أحرف على الأقل.' });
        76 +               setPasswordMessage({ type: 'error', text: 
           + t('profile.messages.passwordTooShort') });
        77                 setIsPasswordChanging(false);
        78                return;
        79            }
        80 
        81            const user = auth.currentUser;
        82            if (!user || !user.email) {
        83 -              setPasswordMessage({ type: 'error', text: '
           -  لا يمكن تغيير كلمة المرور، المستخدم غير مسجل.' });
        83 +              setPasswordMessage({ type: 'error', text: t('profile.
           +  messages.notAuthenticated') });
        84                setIsPasswordChanging(false);
        85                return;
        86            }
        87 
        88            const credential = EmailAuthProvider.credential(user.email,
             currentPassword);
        89 -
        89 +  
        90            try {
        91                await reauthenticateWithCredential(user, credential);
        92                await updatePassword(user, newPassword);
        93 -              setPasswordMessage({ type: 'success', text: '
           -  تم تغيير كلمة المرور بنجاح!' });
        93 +              setPasswordMessage({ type: 'success', text: t('
           +  profile.messages.passwordChanged') });
        94                setCurrentPassword('');
        95                setNewPassword('');
        96                setConfirmPassword('');
        97            } catch (error: any) {
        98                console.error("Password change error:", error);
        99                if (error.code === 'auth/wrong-password' || error.code ===
             'auth/invalid-credential') {
       100 -                   setPasswordMessage({ type: 'error', text: '
           -  كلمة المرور الحالية غير صحيحة.' });
       100 +                   setPasswordMessage({ type: 'error', text: t('profile.
           +  messages.currentPasswordWrong') });
       101                } else {
       102 -                   setPasswordMessage({ type: 'error', text: '
           -  حدث خطأ أثناء تغيير كلمة المرور.' });
       102 +                   setPasswordMessage({ type: 'error', text: t('profile.
           +  messages.passwordChangeError') });
       103                }
       104            } finally {
       105                setIsPasswordChanging(false);

● Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 3 additions and 3 removals
       110 
       111        return (
       112            <div className="max-w-2xl mx-auto space-y-8">
       113 -              <h1 className="text-3xl font-bold mb-6">إدارة حساب المستخدم</h1>
       113 +              <h1 className="text-3xl font-bold mb-6">{t('profile.title')}</h1>
       114 
       115                {isAdmin && (
       116                     <div className="bg-surface p-8 rounded-lg shadow-lg">
       117 -                      <h2 className="text-xl font-bold mb-6 text-text-primary">
           -  معلومات الحساب</h2>
       117 +                      <h2 className="text-xl font-bold mb-6 text-text-primary">
           +  {t('profile.personalInfo')}</h2>
       118                        <form onSubmit={handleProfileUpdate} className="space-y-6">        
       119                             <div>
       120 -                              <label htmlFor="fullName" className="block text-sm         
           -  font-medium text-text-secondary mb-1">الاسم الكامل</label>
       120 +                              <label htmlFor="fullName" className="block text-sm         
           +  font-medium text-text-secondary mb-1">{t('profile.form.name')}</label>
       121                                 <input
       122                                    type="text"
       123                                    id="fullName"

● Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 1 addition and 1 removal
       128                                />
       129                            </div>
       130                            <div className="relative">
       131 -                              <label htmlFor="email" className="block text-sm 
           -  font-medium text-text-secondary mb-1">البريد الإلكتروني (للدخول)</label>
       131 +                              <label htmlFor="email" className="block text-sm 
           +  font-medium text-text-secondary mb-1">{t('profile.form.email')}</label>
       132                                 <div className="absolute inset-y-0 right-0 pr-3
             top-7 flex items-center pointer-events-none">
       133                                    <UserIcon />
       134                                </div>

● Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 1 addition and 1 removal
       151                                    type="submit"
       152                                    className="bg-accent hover:bg-blue-700
             text-white font-bold py-2 px-6 rounded-lg transition duration-300 shadow-lg"
       153                                >
       154 -                                  حفظ معلومات الحساب
       154 +                                  {t('profile.buttons.saveProfile')}
       155                                </button>
       156                            </div>
       157                        </form>

● Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 2 additions and 2 removals
       159                )}
       160 
       161                <div className="bg-surface p-8 rounded-lg shadow-lg">
       162 -                  <h2 className="text-xl font-bold mb-6 text-text-primary">
           -  تغيير كلمة المرور</h2>
       162 +                  <h2 className="text-xl font-bold mb-6 text-text-primary">
           +  {t('profile.passwordChange')}</h2>
       163                    <form onSubmit={handlePasswordChange} className="space-y-6">
       164                        <div className="relative">
       165 -                          <label htmlFor="currentPassword" className="block 
           -  text-sm font-medium text-text-secondary mb-1">كلمة المرور الحالية</label>
       165 +                          <label htmlFor="currentPassword" className="block 
           +  text-sm font-medium text-text-secondary mb-1">
           +  {t('profile.form.currentPassword')}</label>
       166                            <div className="absolute inset-y-0 right-0 pr-3 top-7
             flex items-center pointer-events-none">
       167                                <LockIcon />
       168                            </div>

● Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 1 addition and 1 removal
       176                            />
       177                        </div>
       178                         <div className="relative">
       179 -                          <label htmlFor="newPassword" className="block text-sm 
           -  font-medium text-text-secondary mb-1">كلمة المرور الجديدة</label>
       179 +                          <label htmlFor="newPassword" className="block text-sm 
           +  font-medium text-text-secondary mb-1">{t('profile.form.newPassword')}</label>
       180                             <div className="absolute inset-y-0 right-0 pr-3 top-7
             flex items-center pointer-events-none">
       181                                <LockIcon />
       182                            </div>

● Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 1 addition and 1 removal
       190                            />
       191                        </div>
       192                         <div className="relative">
       193 -                          <label htmlFor="confirmPassword" className="block 
           -  text-sm font-medium text-text-secondary mb-1">تأكيد كلمة المرور الجديدة</label>        
       193 +                          <label htmlFor="confirmPassword" className="block 
           +  text-sm font-medium text-text-secondary mb-1">
           +  {t('profile.form.confirmPassword')}</label>
       194                            <div className="absolute inset-y-0 right-0 pr-3 top-7
             flex items-center pointer-events-none">
       195                                <LockIcon />
       196                            </div>

● Update(pages\ProfilePage.tsx)
  ⎿  Updated pages\ProfilePage.tsx with 1 addition and 1 removal
       216                                disabled={isPasswordChanging}
       217                                className="bg-primary hover:bg-primary-dark
             text-white font-bold py-2 px-6 rounded-lg transition duration-300 shadow-lg
             transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
       218                            >
       219 -                              {isPasswordChanging ? 'جار الحفظ...' : '
           -  حفظ كلمة المرور'}
       219 +                              {isPasswordChanging ? t('profile.buttons.saving') :        
           +  t('profile.buttons.savePassword')}
       220                            </button>
       221                        </div>
       222                    </form>

● Perfect! Now let me update ForgotPasswordModal.tsx with i18n support:

● Update(components\ForgotPasswordModal.tsx)
  ⎿  Updated components\ForgotPasswordModal.tsx with 1 addition
       2    import { sendPasswordResetEmail } from 'firebase/auth';
       3    import { auth } from '../firebase';
       4    import { getAuthErrorMessage, getAuthSuccessMessage } from
           '../utils/authErrorHandler';
       5 +  import { useTranslation } from '../src/i18n/useTranslation';
       6 
       7    interface ForgotPasswordModalProps {
       8        isOpen: boolean;

● Update(components\ForgotPasswordModal.tsx)
  ⎿  Updated components\ForgotPasswordModal.tsx with 1 addition
       10    }
       11 
       12    const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen,
            onClose }) => {
       13 +      const { t } = useTranslation();
       14        const [email, setEmail] = useState('');
       15        const [error, setError] = useState('');
       16        const [success, setSuccess] = useState('');

● Update(components\ForgotPasswordModal.tsx)
  ⎿  Updated components\ForgotPasswordModal.tsx with 2 additions and 2 removals
       22            setSuccess('');
       23 
       24            if (!email.trim()) {
       25 -              setError('يرجى إدخال البريد الإلكتروني');
       25 +              setError(t('auth.errors.emailRequired'));
       26                return;
       27            }
       28 
       29            setIsLoading(true);
       30            try {
       31                await sendPasswordResetEmail(auth, email.trim());
       32 -              setSuccess(getAuthSuccessMessage('password-reset'));
       32 +              setSuccess(t('auth.messages.resetLinkSent'));
       33 
       34                // Auto-close after 3 seconds
       35                setTimeout(() => {

● Update(components\ForgotPasswordModal.tsx)
  ⎿  Updated components\ForgotPasswordModal.tsx with 1 addition and 1 removal
       61            >
       62                <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md
            m-4 transform transition-all duration-300 scale-95 opacity-0
            animate-fade-in-scale">
       63                    <div className="flex justify-between items-center mb-4">
       64 -                      <h2 className="text-xl font-bold text-text-primary">
          -  استعادة كلمة المرور</h2>
       64 +                      <h2 className="text-xl font-bold text-text-primary">
          +  {t('auth.forgotPassword.title')}</h2>
       65                        <button
       66                            onClick={handleClose}
       67                            className="text-gray-400 hover:text-gray-300"

● Update(components\ForgotPasswordModal.tsx)
  ⎿  Updated components\ForgotPasswordModal.tsx with 2 additions and 2 removals
       74                    <form onSubmit={handleSubmit} className="space-y-4">
       75                        <div>
       76                            <label className="block text-sm font-medium
            text-text-primary mb-2">
       77 -                              البريد الإلكتروني
       77 +                              {t('auth.forgotPassword.email')}
       78                            </label>
       79                            <input
       80                                type="email"
       81                                value={email}
       82                                onChange={(e) => setEmail(e.target.value)}
       83 -                              placeholder="أدخل بريدك الإلكتروني"
       83 +
          + placeholder={t('auth.forgotPassword.emailPlaceholder')}
       84                                className="w-full bg-background border
            border-gray-600 rounded-md p-3 text-text-primary focus:ring-primary
            focus:border-primary placeholder-gray-500 disabled:opacity-50"
       85                                required
       86                                disabled={isLoading}

● Update(components\ForgotPasswordModal.tsx)
  ⎿  Updated components\ForgotPasswordModal.tsx with 4 additions and 4 removals
       106                                className="flex-1 bg-gray-600 hover:bg-gray-700
             text-white font-bold py-2 px-4 rounded-lg transition duration-300"
       107                                disabled={isLoading}
       108                            >
       109 -                              إلغاء
       109 +                              {t('auth.forgotPassword.cancel')}
       110                            </button>
       111                            <button
       112                                type="submit"
       113 -                              disabled={isLoading || success}
       113 +                              disabled={isLoading || !!success}
       114                                className="flex-1 bg-primary hover:bg-primary-dark
             text-white font-bold py-2 px-4 rounded-lg transition duration-300
             disabled:opacity-50"
       115                            >
       116                                {isLoading ? (
       117                                    <div className="flex items-center
             justify-center">
       118                                        <div className="animate-spin rounded-full
             h-4 w-4 border-b-2 border-white mr-2"></div>
       119 -                                      جار الإرسال...
       119 +                                      {t('auth.forgotPassword.sending')}
       120                                    </div>
       121                                ) : (