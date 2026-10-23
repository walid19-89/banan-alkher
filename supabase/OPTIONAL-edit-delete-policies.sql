-- ============================================================================
-- OPTIONAL — تفعيل أزرار «تعديل» و«حذف» للسندات وطلبات الصرف
-- ============================================================================
-- حالياً قاعدة البيانات لا تسمح بتعديل أو حذف السندات وطلبات الصرف
-- (لا توجد سياسات UPDATE/DELETE لها). هذا قرار آمن افتراضياً.
--
-- لتفعيل الميزة: افتح مشروعك في Lovable وأرسل هذه الجملة في المحادثة:
--   «طبّق هذا الكود على قاعدة البيانات» + انسخ محتوى هذا الملف.
-- بعد الموافقة ستعمل الأزرار مباشرة بدون أي تعديل آخر على الكود.
-- ============================================================================

-- تعديل سندات القبض: المدير والمحاسب فقط (سندات الاشتراكات تُدار بالسداد تلقائياً)
CREATE POLICY "receipts staff update" ON public.fund_receipts
  FOR UPDATE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']))
  WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']));

-- حذف سندات القبض: المدير والمحاسب فقط
CREATE POLICY "receipts staff delete" ON public.fund_receipts
  FOR DELETE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']));

-- تعديل طلبات الصرف: أي موظف، وطلبات معلقة فقط (لا يمكن التعديل بعد الاعتماد حفاظاً على السجلات)
CREATE POLICY "expenses update pending" ON public.fund_expense_requests
  FOR UPDATE TO authenticated
  USING (public.fund_is_staff(auth.uid()) AND status = 'pending')
  WITH CHECK (public.fund_is_staff(auth.uid()) AND status = 'pending');

-- حذف طلبات صرف معلقة: المدير فقط
CREATE POLICY "expenses admin delete pending" ON public.fund_expense_requests
  FOR DELETE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin']) AND status = 'pending');
