-- === profiles: users can only update their own display_name / email ===
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, email) ON public.profiles TO authenticated;

-- === proxies: users only see their own assigned rows; admins see everything ===
DROP POLICY IF EXISTS "users see own + available proxies" ON public.proxies;
CREATE POLICY "users see own proxies" ON public.proxies FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- === user_roles: explicitly restrict writes to admin only ===
CREATE POLICY "admin insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
