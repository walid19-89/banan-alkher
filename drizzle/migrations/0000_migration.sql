
-- ========== Settings ==========
CREATE TABLE public.fund_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_name text NOT NULL DEFAULT 'صندوق بنان الخير للبنيان – الغدير – مقبنة – تعز',
  logo_url text,
  default_monthly_fee numeric NOT NULL DEFAULT 1000 CHECK (default_monthly_fee >= 0),
  currency text NOT NULL DEFAULT 'ريال يمني',
  opening_balance numeric NOT NULL DEFAULT 0,
  allow_self_approval boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.fund_settings TO authenticated;
GRANT ALL ON public.fund_settings TO service_role;
ALTER TABLE public.fund_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.fund_settings DEFAULT VALUES;

-- ========== Profiles & roles ==========
CREATE TABLE public.fund_user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  linked_member_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.fund_user_profiles TO authenticated;
GRANT ALL ON public.fund_user_profiles TO service_role;
ALTER TABLE public.fund_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fund_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','accountant','treasurer','board_member','member')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.fund_user_roles TO authenticated;
GRANT ALL ON public.fund_user_roles TO service_role;
ALTER TABLE public.fund_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fund_role(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.role FROM public.fund_user_roles r
  JOIN public.fund_user_profiles p ON p.user_id = r.user_id
  WHERE r.user_id = _uid AND p.active
$$;

CREATE OR REPLACE FUNCTION public.fund_has_role(_uid uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.fund_role(_uid) = ANY(_roles), false)
$$;

CREATE OR REPLACE FUNCTION public.fund_is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.fund_has_role(_uid, ARRAY['admin','accountant','treasurer','board_member'])
$$;

-- ========== Members ==========
CREATE SEQUENCE public.fund_member_no_seq;
CREATE TABLE public.fund_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_no text UNIQUE,
  full_name text NOT NULL,
  phone text,
  address text DEFAULT 'الغدير - مقبنة - تعز',
  monthly_fee numeric NOT NULL DEFAULT 1000 CHECK (monthly_fee >= 0),
  joined_on date NOT NULL DEFAULT current_date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_members TO authenticated;
GRANT ALL ON public.fund_members TO service_role;
ALTER TABLE public.fund_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fund_members_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.member_no IS NULL OR NEW.member_no = '' THEN
    NEW.member_no := 'M-' || lpad(nextval('public.fund_member_no_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fund_members_no BEFORE INSERT ON public.fund_members
FOR EACH ROW EXECUTE FUNCTION public.fund_members_before_insert();

ALTER TABLE public.fund_user_profiles
  ADD CONSTRAINT fund_user_profiles_member_fk FOREIGN KEY (linked_member_id) REFERENCES public.fund_members(id) ON DELETE SET NULL;

-- ========== Subscriptions ==========
CREATE TABLE public.fund_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.fund_members(id) ON DELETE CASCADE,
  due_month date NOT NULL,
  amount numeric NOT NULL DEFAULT 1000 CHECK (amount > 0),
  paid_amount numeric NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= amount),
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, due_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_subscriptions TO authenticated;
GRANT ALL ON public.fund_subscriptions TO service_role;
ALTER TABLE public.fund_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fund_subscriptions_normalize()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.due_month := date_trunc('month', NEW.due_month)::date;
  NEW.status := CASE WHEN NEW.paid_amount >= NEW.amount THEN 'paid'
                     WHEN NEW.paid_amount > 0 THEN 'partial' ELSE 'unpaid' END;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fund_subscriptions_normalize BEFORE INSERT OR UPDATE ON public.fund_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.fund_subscriptions_normalize();

-- ========== Receipts ==========
CREATE TABLE public.fund_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  receipt_type text NOT NULL CHECK (receipt_type IN ('subscription','donation','other')),
  member_id uuid REFERENCES public.fund_members(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.fund_subscriptions(id) ON DELETE SET NULL,
  donor_name text,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer')),
  is_restricted boolean NOT NULL DEFAULT false,
  restricted_purpose text,
  receipt_date date NOT NULL DEFAULT current_date,
  attachment_url text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.fund_receipts TO authenticated;
GRANT ALL ON public.fund_receipts TO service_role;
ALTER TABLE public.fund_receipts ENABLE ROW LEVEL SECURITY;

-- ========== Expense requests ==========
CREATE SEQUENCE public.fund_voucher_seq;
CREATE TABLE public.fund_expense_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  category text NOT NULL CHECK (category IN ('social_aid','charitable_aid','medical_aid','emergency_aid','operational')),
  beneficiary_name text NOT NULL,
  beneficiary_phone text,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  requested_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  approval_count integer NOT NULL DEFAULT 0 CHECK (approval_count BETWEEN 0 AND 2),
  payment_voucher_no text,
  attachment_url text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  disbursed_by uuid,
  disbursed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.fund_expense_requests TO authenticated;
GRANT ALL ON public.fund_expense_requests TO service_role;
ALTER TABLE public.fund_expense_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fund_expense_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.status := 'pending'; NEW.approval_count := 0; NEW.created_by := auth.uid();
  NEW.payment_voucher_no := NULL; NEW.disbursed_by := NULL; NEW.disbursed_at := NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fund_expense_before_insert BEFORE INSERT ON public.fund_expense_requests
FOR EACH ROW EXECUTE FUNCTION public.fund_expense_before_insert();

CREATE TABLE public.fund_expense_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.fund_expense_requests(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  approver_name text NOT NULL,
  approver_role text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, approver_id)
);
GRANT SELECT ON public.fund_expense_approvals TO authenticated;
GRANT ALL ON public.fund_expense_approvals TO service_role;
ALTER TABLE public.fund_expense_approvals ENABLE ROW LEVEL SECURITY;

-- ========== Audit ==========
CREATE TABLE public.fund_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  actor_id uuid,
  actor_name text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fund_audit_logs TO authenticated;
GRANT ALL ON public.fund_audit_logs TO service_role;
ALTER TABLE public.fund_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fund_log(_action text, _entity text, _entity_id text, _details text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.fund_audit_logs(action, entity_type, entity_id, actor_id, actor_name, details)
  VALUES (_action, _entity, _entity_id, auth.uid(),
          (SELECT full_name FROM public.fund_user_profiles WHERE user_id = auth.uid()), _details);
END $$;
REVOKE EXECUTE ON FUNCTION public.fund_log(text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fund_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d text;
BEGIN
  IF TG_TABLE_NAME = 'fund_members' THEN
    d := coalesce(NEW.full_name, OLD.full_name) || ' (' || coalesce(NEW.member_no, OLD.member_no, '') || ')';
  ELSIF TG_TABLE_NAME = 'fund_receipts' THEN
    d := 'سند قبض رقم ' || NEW.receipt_no || ' بمبلغ ' || NEW.amount;
  ELSIF TG_TABLE_NAME = 'fund_expense_requests' THEN
    d := 'طلب صرف رقم ' || NEW.request_no || ' بمبلغ ' || NEW.amount || ' - ' || NEW.beneficiary_name;
  ELSIF TG_TABLE_NAME = 'fund_settings' THEN
    d := 'الرصيد الافتتاحي: ' || NEW.opening_balance || '، الاشتراك الافتراضي: ' || NEW.default_monthly_fee || '، الاعتماد الذاتي: ' || NEW.allow_self_approval;
  ELSIF TG_TABLE_NAME = 'fund_user_roles' THEN
    d := 'تغيير الصلاحية من ' || OLD.role || ' إلى ' || NEW.role || ' للمستخدم ' || (SELECT full_name FROM public.fund_user_profiles WHERE user_id = NEW.user_id);
  END IF;
  PERFORM public.fund_log(lower(TG_OP), TG_TABLE_NAME, coalesce(NEW.id::text, OLD.id::text), d);
  RETURN coalesce(NEW, OLD);
EXCEPTION WHEN undefined_column THEN
  PERFORM public.fund_log(lower(TG_OP), TG_TABLE_NAME, NULL, d);
  RETURN coalesce(NEW, OLD);
END $$;

CREATE TRIGGER trg_audit_members AFTER INSERT OR UPDATE OR DELETE ON public.fund_members FOR EACH ROW EXECUTE FUNCTION public.fund_audit_trigger();
CREATE TRIGGER trg_audit_receipts AFTER INSERT ON public.fund_receipts FOR EACH ROW EXECUTE FUNCTION public.fund_audit_trigger();
CREATE TRIGGER trg_audit_expenses AFTER INSERT ON public.fund_expense_requests FOR EACH ROW EXECUTE FUNCTION public.fund_audit_trigger();
CREATE TRIGGER trg_audit_settings AFTER UPDATE ON public.fund_settings FOR EACH ROW EXECUTE FUNCTION public.fund_audit_trigger();

CREATE OR REPLACE FUNCTION public.fund_roles_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM public.fund_log('update', 'fund_user_roles', NEW.user_id::text,
      'تغيير الصلاحية من ' || OLD.role || ' إلى ' || NEW.role || ' للمستخدم ' || coalesce((SELECT full_name FROM public.fund_user_profiles WHERE user_id = NEW.user_id), ''));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_roles AFTER UPDATE ON public.fund_user_roles FOR EACH ROW EXECUTE FUNCTION public.fund_roles_audit();

-- ========== Signup bootstrap ==========
CREATE OR REPLACE FUNCTION public.fund_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(778899);
  SELECT NOT EXISTS (SELECT 1 FROM public.fund_user_profiles) INTO is_first;
  INSERT INTO public.fund_user_profiles(user_id, full_name, email, phone)
  VALUES (NEW.id,
    CASE WHEN is_first THEN 'مدير صندوق بنان الخير للبنيان'
         ELSE coalesce(nullif(NEW.raw_user_meta_data->>'full_name',''), nullif(NEW.raw_user_meta_data->>'name',''), split_part(NEW.email,'@',1)) END,
    NEW.email, NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.fund_user_roles(user_id, role) VALUES (NEW.id, CASE WHEN is_first THEN 'admin' ELSE 'member' END);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_fund AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fund_handle_new_user();

-- ========== RLS policies ==========
CREATE POLICY "settings read" ON public.fund_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin update" ON public.fund_settings FOR UPDATE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin'])) WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin']));

CREATE POLICY "profiles read" ON public.fund_user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fund_is_staff(auth.uid()));
CREATE POLICY "profiles admin update" ON public.fund_user_profiles FOR UPDATE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin'])) WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin']));

CREATE POLICY "roles read" ON public.fund_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fund_is_staff(auth.uid()));
CREATE POLICY "roles admin update" ON public.fund_user_roles FOR UPDATE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin'])) WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin']));

CREATE POLICY "members read" ON public.fund_members FOR SELECT TO authenticated
  USING (public.fund_is_staff(auth.uid()) OR id = (SELECT linked_member_id FROM public.fund_user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "members write" ON public.fund_members FOR INSERT TO authenticated
  WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']));
CREATE POLICY "members update" ON public.fund_members FOR UPDATE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin','accountant'])) WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']));
CREATE POLICY "members delete" ON public.fund_members FOR DELETE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin']));

CREATE POLICY "subs read" ON public.fund_subscriptions FOR SELECT TO authenticated
  USING (public.fund_is_staff(auth.uid()) OR member_id = (SELECT linked_member_id FROM public.fund_user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "receipts read" ON public.fund_receipts FOR SELECT TO authenticated
  USING (public.fund_is_staff(auth.uid()) OR member_id = (SELECT linked_member_id FROM public.fund_user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "receipts insert" ON public.fund_receipts FOR INSERT TO authenticated
  WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin','accountant','treasurer']) AND receipt_type <> 'subscription');

CREATE POLICY "expenses read" ON public.fund_expense_requests FOR SELECT TO authenticated USING (public.fund_is_staff(auth.uid()));
CREATE POLICY "expenses insert" ON public.fund_expense_requests FOR INSERT TO authenticated
  WITH CHECK (public.fund_is_staff(auth.uid()));

CREATE POLICY "approvals read" ON public.fund_expense_approvals FOR SELECT TO authenticated USING (public.fund_is_staff(auth.uid()));
CREATE POLICY "audit read" ON public.fund_audit_logs FOR SELECT TO authenticated USING (public.fund_is_staff(auth.uid()));

-- ========== Business RPCs ==========
CREATE OR REPLACE FUNCTION public.fund_cash_balance()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT opening_balance FROM public.fund_settings LIMIT 1)
       + coalesce((SELECT sum(amount) FROM public.fund_receipts), 0)
       - coalesce((SELECT sum(amount) FROM public.fund_expense_requests WHERE status = 'paid'), 0)
$$;
REVOKE EXECUTE ON FUNCTION public.fund_cash_balance() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.fund_summary()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cash numeric; committed numeric; r json;
BEGIN
  IF NOT public.fund_is_staff(auth.uid()) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  cash := public.fund_cash_balance();
  committed := coalesce((SELECT sum(amount) FROM fund_expense_requests WHERE status = 'approved'), 0);
  SELECT json_build_object(
    'opening_balance', (SELECT opening_balance FROM fund_settings LIMIT 1),
    'cash_balance', cash,
    'committed', committed,
    'net_available', cash - committed,
    'total_revenue', coalesce((SELECT sum(amount) FROM fund_receipts), 0),
    'total_paid_expenses', coalesce((SELECT sum(amount) FROM fund_expense_requests WHERE status = 'paid'), 0),
    'arrears', coalesce((SELECT sum(amount - paid_amount) FROM fund_subscriptions), 0),
    'pending_requests', (SELECT count(*) FROM fund_expense_requests WHERE status = 'pending'),
    'approved_requests', (SELECT count(*) FROM fund_expense_requests WHERE status = 'approved'),
    'rev_subscriptions', coalesce((SELECT sum(amount) FROM fund_receipts WHERE receipt_type = 'subscription'), 0),
    'rev_general_donations', coalesce((SELECT sum(amount) FROM fund_receipts WHERE receipt_type <> 'subscription' AND NOT is_restricted), 0),
    'rev_restricted_donations', coalesce((SELECT sum(amount) FROM fund_receipts WHERE receipt_type <> 'subscription' AND is_restricted), 0),
    'active_members', (SELECT count(*) FROM fund_members WHERE active),
    'expenses_by_category', coalesce((SELECT json_object_agg(category, total) FROM (SELECT category, sum(amount) total FROM fund_expense_requests WHERE status = 'paid' GROUP BY category) x), '{}'::json)
  ) INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.fund_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.fund_public_branding()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object('fund_name', fund_name, 'logo_url', logo_url) FROM public.fund_settings LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.fund_public_branding() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fund_generate_monthly_dues(p_month date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m date := date_trunc('month', p_month)::date; n integer;
BEGIN
  IF NOT public.fund_has_role(auth.uid(), ARRAY['admin','accountant']) THEN RAISE EXCEPTION 'غير مصرح بتوليد الاستحقاقات'; END IF;
  INSERT INTO fund_subscriptions(member_id, due_month, amount)
  SELECT id, m, monthly_fee FROM fund_members WHERE active AND monthly_fee > 0
  ON CONFLICT (member_id, due_month) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM fund_log('generate_dues', 'fund_subscriptions', to_char(m, 'YYYY-MM'), 'توليد ' || n || ' استحقاق لشهر ' || to_char(m, 'YYYY-MM'));
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.fund_generate_monthly_dues(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_generate_monthly_dues(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fund_pay_subscription(p_subscription_id uuid, p_amount numeric, p_method text DEFAULT 'cash', p_date date DEFAULT current_date, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s fund_subscriptions; rid uuid; mname text;
BEGIN
  IF NOT public.fund_has_role(auth.uid(), ARRAY['admin','accountant','treasurer']) THEN RAISE EXCEPTION 'غير مصرح بتسجيل السداد'; END IF;
  SELECT * INTO s FROM fund_subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الاستحقاق غير موجود'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;
  IF p_amount > s.amount - s.paid_amount THEN RAISE EXCEPTION 'المبلغ أكبر من المتبقي على الاستحقاق (%)', s.amount - s.paid_amount; END IF;
  UPDATE fund_subscriptions SET paid_amount = paid_amount + p_amount WHERE id = s.id;
  SELECT full_name INTO mname FROM fund_members WHERE id = s.member_id;
  INSERT INTO fund_receipts(receipt_type, member_id, subscription_id, donor_name, amount, payment_method, receipt_date, notes, created_by)
  VALUES ('subscription', s.member_id, s.id, mname, p_amount, coalesce(p_method,'cash'), coalesce(p_date, current_date),
          coalesce(p_notes, 'سداد اشتراك شهر ' || to_char(s.due_month, 'YYYY-MM')), auth.uid())
  RETURNING id INTO rid;
  RETURN rid;
END $$;
REVOKE EXECUTE ON FUNCTION public.fund_pay_subscription(uuid,numeric,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_pay_subscription(uuid,numeric,text,date,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fund_decide_expense(p_request_id uuid, p_decision text, p_notes text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req fund_expense_requests; role_ text; uname text; self_ok boolean; cnt integer;
BEGIN
  role_ := public.fund_role(auth.uid());
  IF role_ IS NULL OR role_ NOT IN ('admin','treasurer','board_member') THEN RAISE EXCEPTION 'غير مصرح بالاعتماد'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'قرار غير صالح'; END IF;
  SELECT * INTO req FROM fund_expense_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'الطلب ليس بانتظار الاعتماد'; END IF;
  SELECT allow_self_approval INTO self_ok FROM fund_settings LIMIT 1;
  IF req.created_by = auth.uid() AND NOT coalesce(self_ok, false) THEN RAISE EXCEPTION 'لا يمكنك اعتماد طلب قمت بإنشائه'; END IF;
  IF EXISTS (SELECT 1 FROM fund_expense_approvals WHERE request_id = req.id AND approver_id = auth.uid()) THEN
    RAISE EXCEPTION 'سبق لك إبداء قرار على هذا الطلب'; END IF;
  SELECT full_name INTO uname FROM fund_user_profiles WHERE user_id = auth.uid();
  INSERT INTO fund_expense_approvals(request_id, approver_id, approver_name, approver_role, decision, notes)
  VALUES (req.id, auth.uid(), coalesce(uname,''), role_, p_decision, p_notes);
  IF p_decision = 'rejected' THEN
    UPDATE fund_expense_requests SET status = 'rejected' WHERE id = req.id;
    PERFORM fund_log('reject', 'fund_expense_requests', req.id::text, 'رفض طلب الصرف رقم ' || req.request_no);
  ELSE
    SELECT count(*) INTO cnt FROM fund_expense_approvals WHERE request_id = req.id AND decision = 'approved';
    cnt := least(cnt, 2);
    UPDATE fund_expense_requests SET approval_count = cnt, status = CASE WHEN cnt >= 2 THEN 'approved' ELSE 'pending' END WHERE id = req.id;
    PERFORM fund_log('approve', 'fund_expense_requests', req.id::text, 'اعتماد رقم ' || cnt || ' لطلب الصرف رقم ' || req.request_no);
  END IF;
  RETURN (SELECT row_to_json(x) FROM fund_expense_requests x WHERE id = req.id);
END $$;
REVOKE EXECUTE ON FUNCTION public.fund_decide_expense(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_decide_expense(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fund_disburse_expense(p_request_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req fund_expense_requests; cash numeric; v text;
BEGIN
  IF NOT public.fund_has_role(auth.uid(), ARRAY['admin','treasurer']) THEN RAISE EXCEPTION 'الصرف مسموح لأمين الصندوق أو المدير فقط'; END IF;
  PERFORM pg_advisory_xact_lock(445566);
  SELECT * INTO req FROM fund_expense_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF req.status <> 'approved' OR req.approval_count < 2 THEN RAISE EXCEPTION 'الطلب غير معتمد من شخصين'; END IF;
  cash := public.fund_cash_balance();
  IF cash < req.amount THEN RAISE EXCEPTION 'الرصيد النقدي غير كافٍ (المتاح %)', cash; END IF;
  v := 'PV-' || lpad(nextval('fund_voucher_seq')::text, 4, '0');
  UPDATE fund_expense_requests SET status = 'paid', payment_voucher_no = v, disbursed_by = auth.uid(), disbursed_at = now() WHERE id = req.id;
  PERFORM fund_log('disburse', 'fund_expense_requests', req.id::text, 'صرف ' || req.amount || ' بسند ' || v || ' لطلب رقم ' || req.request_no);
  RETURN (SELECT row_to_json(x) FROM fund_expense_requests x WHERE id = req.id);
END $$;
REVOKE EXECUTE ON FUNCTION public.fund_disburse_expense(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_disburse_expense(uuid) TO authenticated;

-- ========== Storage policies ==========
CREATE POLICY "fund docs staff upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fund-documents' AND public.fund_is_staff(auth.uid()));
CREATE POLICY "fund docs staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fund-documents' AND public.fund_is_staff(auth.uid()));
