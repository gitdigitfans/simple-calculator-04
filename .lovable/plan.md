## المشاكل والحلول

### 1) صور المنتجات بتختفي بعد تعديل الطلب
**السبب:** في `saveOrderChanges` (js/admin.js:1271) بيتحفظ `image: ''` فاضية، وكمان `category: ''`.
**الحل:** استرجع الصورة والقسم من المنتج الأصلي (`products.find(p.id)` → `p.images[0]` و `p.category`) قبل الحفظ. لو ما لقاش الـproduct نحتفظ بالقيمة القديمة من `item.image`.

### 2) خانة ملاحظات العميل مش ظاهرة في تعديل الطلب
**الحال:** الحقل `eo_notes` موجود فعلاً في المودال (سطر 1094-1095) واسمه "ملاحظات العميل". 
**التوضيح المطلوب:** المستخدم يقصد إن الملاحظة اللي كتبها العميل في `checkout` مش بتظهر في **صفحة الطلبات (الكارت الأساسي)** ولا في **modal التعديل**؟ الكود بيعرضها فعلاً (`order.notes` سطر 985 و 1051). محتاج أتأكد إن الحقل بيتقرأ صح من الداتابيز، وأضيف حقل تاني منفصل للـ **admin notes** يظهر للعميل في صفحة "طلباتي".
**الحل المقترح:** 
- أضيف قسم واضح في modal التعديل يعرض `notes` (ملاحظة العميل) كـ read-only + textarea جديد `admin_notes` (ملاحظة الإدارة للعميل) تتحفظ وتظهر للعميل في dashboard طلباتي.

### 3) صور المنتجات مش ظاهرة عند إضافة منتج للطلب
**السبب:** في `renderEditOrderItems` و `addEditOrderItem` القائمة `<select>` عاملة بالاسم بس من غير صورة.  
**الحل:** أستبدل الـ `<select>` بـ combobox مخصص (dropdown يعرض صورة + اسم + سعر + السعر) عشان الأدمن يعرف يميز بين المنتجات اللي بنفس الاسم.

### 4) الجرد مش بيتظبط عند تعديل مقاس/إضافة منتج للطلب
**السبب:** `saveOrderChanges` بيبعت `updateOrder(id, updates)` اللي بيعمل PATCH عادي على جدول orders بدون أي منطق للفرق بين items القديمة والجديدة، فالمخزون ما بيتحدثش.
**الحل:** 
- أعمل RPC جديدة `admin_update_order` تاخد `old_items` و `new_items`، وتحسب الفرق: كل item قديم متلغي → `stock += qty`، كل item جديد/مضاف → `stock -= qty`. وتحدث `orders` و `product_variants` في transaction واحد.
- في الفرونت أستدعي الـ RPC بدل `updateOrder` وأبعت الـ `original items` من الطلب قبل التعديل.

### 5) الفلتر مش شغال على الموبايل
**السبب:** في `products.html:462-466` بيتم نسخ HTML الفلاتر الديسكتوب إلى container الموبايل بـ `innerHTML`. ده بيعمل **IDs مكررة** (`filterCategory`, `filterAvailability`...) فالوظائف اللي بتقرا `getElementById` بترجع نسخة الديسكتوب دايماً، فتفاعل الموبايل ما بيأثرش.
**الحل:** 
- عدل `renderFilters` عشان يستقبل `containerId` كـ parameter وأعمل version مخصصة للموبايل بـ IDs مختلفة (`m_filterCategory`, `m_filterAvailability`).
- أعمل نسخة موبايل من الـ handlers (`onFilterCategoryChange`) تقرأ من الـ ID الصح، أو أخلي كل filter يستخدم `event.currentTarget` بدل `getElementById`.
- أخلي فتح الموبايل filter modal يعيد الرندر للاتنين.

### 6) كوبون العرض (auto_apply) مش شغال إلا لو اتكتب في checkout
**السبب:** في cart drawer (`renderCart` سطر 680) الشرط `!c.autoApply` (camelCase) دايماً `true` فبيعتبر أي كوبون manual. لكن `applyCouponCode` (سطر 898) بيرفض `auto_apply === true` فلما المستخدم يكتبه من الدرج بيرفضه أو يعرضه، لكن checkout عنده applyCheckoutCoupon مستقل بنفس الشرط.
**التوضيح:** لكن المستخدم بيقول عكس ده — إن الكود مش بيشتغل إلا لو اتكتب في checkout. يعني الكود المدخل في cart drawer مش بيتنقل لـ checkout.
**الحل:**
- أخلي `appliedCouponCode` (الـ global state) يتحفظ في `sessionStorage` عشان ينتقل من cart drawer إلى checkout page.
- في `checkout.html` عند التحميل، أقرا الكوبون المحفوظ وأملي `checkoutCoupon` input تلقائياً وأطبقه.
- أوحد شرط الكوبون: يقبل أي كوبون active بغض النظر عن `auto_apply`، عشان الكود اللي مربوط بعرض يشتغل كمان manually.

### 7) كوبون بقسم معين مش شغال
**السبب:** في `saveCoupon` (سطر 704, 723) بيتحفظ `conditions.category = category` والقيمة هي `cat.id` (رقم). لكن في `calculateCouponDiscount` (سطر 814) بيقارن `cond.category === i.category` والـ `i.category` = **slug** نص. مقارنة id vs slug = دائماً false.
**الحل:** 
- في `saveCoupon` أخزن الـ **slug** بدل الـ id: أجيب `categories.find(c => c.id == categoryId)?.slug`.
- أو الأفضل: أعدل المقارنة تعتمد على id: أخلي `i.category` يحمل الـ id، أو أعمل lookup في `calculateCouponDiscount`. الأنسب الحل الأول عشان أقل تغيير.

---

## ترتيب التنفيذ والاختبار
كل نقطة أعملها منفصلة، أنفذ، وأتأكد من التغيير:
1. **#7 كوبون قسم** — سهل وسريع.
2. **#6 نقل الكوبون بين cart وcheckout** — تعديل state + sessionStorage.
3. **#5 فلتر الموبايل** — إعادة هيكلة renderFilters.
4. **#1 صور الطلب** — استرجاع من products.
5. **#3 dropdown بصور** — تحديث UI للـ items.
6. **#2 ملاحظات العميل + admin_notes** — إضافة عمود جديد للـ orders + عرض في dashboard.
7. **#4 تحديث المخزون** — أخطر حاجة، محتاج RPC جديدة في Supabase + تعديل الفرونت.

## ملاحظة قبل التنفيذ
- النقطة #4 محتاجة migration جديدة في Supabase (RPC function) — ده تعديل schema.
- النقطة #2 محتاجة تأكيد: هل تحب أضيف حقل `admin_notes` جديد يظهر للعميل، ولا خانة الملاحظات القديمة كافية وبس محتاجة تكون واضحة أكتر؟
