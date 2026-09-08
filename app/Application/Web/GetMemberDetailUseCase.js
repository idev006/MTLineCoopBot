/**
 * @fileoverview Application.Web.GetMemberDetailUseCase
 * Staff-facing member detail with server-side RBAC and sanitized projection.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.GetMemberDetailUseCase = (() => {
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
      mem_position_score:Number(m.mem_position_score||0),
      mem_rank_score:Number(m.mem_rank_score||0),
      mem_kk:Number(m.mem_kk||0),
      mem_bk:Number(m.mem_bk||0),
      mem_bh:Number(m.mem_bh||0),
      line_linked:!!m.line_user_id
    };
  }

  function create(deps) {
    const d=deps||{};
    const repo=Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const authorization=d.authorization;
    if(!authorization||typeof authorization.requireAnyRole!=='function'){
      throw new Error('GetMemberDetailUseCase requires authorization.requireAnyRole');
    }

    function execute(input) {
      const x=input||{};
      const allowed=authorization.requireAnyRole(x.principal, ROLES);
      if(!allowed.allowed) return {ok:false,error:{code:allowed.reason==='unauthenticated'?'UNAUTHENTICATED':'FORBIDDEN'}};

      const memberCode=String(x.memberCode||'').trim();
      if(!memberCode) return {ok:false,error:{code:'VALIDATION'}};

      const member=repo.findByMemberCode(memberCode);
      if(!member) return {ok:false,error:{code:'MEMBER_NOT_FOUND'}};

      return {
        ok:true,
        data:{
          member:project(member),
          savings:repo.findSavingsByMember(memberCode)||[],
          loans:repo.findLoansByMember(memberCode)||[],
          dividends:repo.findDividendsByMember(memberCode)||[]
        }
      };
    }

    return Object.freeze({execute});
  }

  return {create,ROLES};
})();
