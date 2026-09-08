/**
 * @fileoverview Application.Web.ListMembersUseCase
 * Staff-facing member list with server-side RBAC and sanitized projection.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.ListMembersUseCase = (() => {
  'use strict';
  const ROLES = Object.freeze(['staff','admin','manager']);

  function project(m) {
    return {
      mem_code:m.mem_code,
      mem_title:m.mem_title || '',
      mem_fname:m.mem_fname || '',
      mem_lname:m.mem_lname || '',
      mem_status:m.mem_status || '',
      mem_eff_dt:m.mem_eff_dt || '',
      mem_exp_dt:m.mem_exp_dt || '',
      mem_role:m.mem_role || 'member',
      mem_position:m.mem_position || '',
      line_linked:!!m.line_user_id
    };
  }

  function create(deps) {
    const d=deps||{};
    const repo=Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const authorization=d.authorization;
    if(!authorization||typeof authorization.requireAnyRole!=='function'){
      throw new Error('ListMembersUseCase requires authorization.requireAnyRole');
    }

    function execute(input) {
      const x=input||{};
      const allowed=authorization.requireAnyRole(x.principal, ROLES);
      if(!allowed.allowed) return {ok:false,error:{code:allowed.reason==='unauthenticated'?'UNAUTHENTICATED':'FORBIDDEN'}};

      const page=Math.max(1, Number(x.page)||1);
      const limit=Math.min(100, Math.max(1, Number(x.limit)||20));
      const search=String(x.search||'').trim().toLowerCase();
      const status=String(x.status||'').trim();

      let rows=repo.listMembers()||[];
      if(status) rows=rows.filter(m=>String(m.mem_status||'')===status);
      if(search){
        rows=rows.filter(m=>[
          m.mem_code,m.mem_fname,m.mem_lname,
          [m.mem_title,m.mem_fname,m.mem_lname].filter(Boolean).join(' ')
        ].some(v=>String(v||'').toLowerCase().includes(search)));
      }

      const total=rows.length;
      const totalPages=total===0?0:Math.ceil(total/limit);
      const start=(page-1)*limit;
      const members=rows.slice(start,start+limit).map(project);

      return {ok:true,data:{members,page,limit,total,totalPages}};
    }

    return Object.freeze({execute});
  }

  return {create,ROLES};
})();
