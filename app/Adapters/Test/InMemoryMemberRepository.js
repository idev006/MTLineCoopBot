/**
 * @fileoverview Adapters.Test.InMemoryMemberRepository
 * Deterministic plug-compatible MemberRepositoryPort adapter for automated tests.
 *
 * No Apps Script, SpreadsheetApp, network, or production storage dependencies.
 * This adapter intentionally mirrors the current persistence contract while
 * avoiding ownership of domain authorization/policy.
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.InMemoryMemberRepository = (() => {
  'use strict';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function create(seed) {
    const initial = clone(seed || {});

    function makeState() {
      return {
        members: clone(initial.members || []),
        savings: clone(initial.savings || []),
        loans: clone(initial.loans || []),
        dividends: clone(initial.dividends || []),
        activationLogs: clone(initial.activationLogs || []),
        expiryLogs: clone(initial.expiryLogs || []),
        notices: clone(initial.notices || []),
        reminderLogs: clone(initial.reminderLogs || []),
        content: clone(initial.content || {})
      };
    }

    let state = makeState();

    function withRow(member, index) {
      if (!member) return null;
      return Object.assign({}, clone(member), { _rowIndex: index + 2 });
    }

    function findMemberIndex(predicate) {
      return state.members.findIndex(predicate);
    }

    function findByLineUserId(lineUserId) {
      const i = findMemberIndex(m => String(m.line_user_id || '') === String(lineUserId || ''));
      return i >= 0 ? withRow(state.members[i], i) : null;
    }

    function findByMemberCode(memberCode) {
      const i = findMemberIndex(m => String(m.mem_code || '') === String(memberCode || ''));
      return i >= 0 ? withRow(state.members[i], i) : null;
    }

    function findByActivateCode(activateCode) {
      const i = findMemberIndex(m => String(m.activate_code || '') === String(activateCode || ''));
      return i >= 0 ? withRow(state.members[i], i) : null;
    }

    // Compatibility persistence operation.
    // Domain policy/dates must migrate to ActivateMemberUseCase; this method only
    // applies values provided by the current legacy-shaped contract.
    function activateMember(rowIndex, lineUserId) {
      const i = Number(rowIndex) - 2;
      if (i < 0 || i >= state.members.length) {
        throw new Error('Member row not found: ' + rowIndex);
      }
      state.members[i].line_user_id = lineUserId;
      return {
        memEffDt: state.members[i].mem_eff_dt || null,
        memExpDt: state.members[i].mem_exp_dt || null,
        memStatus: state.members[i].mem_status || null
      };
    }

    function byMember(rows, memCode) {
      return clone(rows.filter(r => String(r.mem_code || '') === String(memCode || '')));
    }

    function saveActivation(rowIndex, activation) {
      const i = Number(rowIndex) - 2;
      if (i < 0 || i >= state.members.length) {
        throw new Error('Member row not found: ' + rowIndex);
      }
      const a = clone(activation || {});
      state.members[i].mem_eff_dt = a.memEffDt;
      state.members[i].mem_exp_dt = a.memExpDt;
      state.members[i].mem_status = a.memStatus;
      state.members[i].line_user_id = a.lineUserId;
      return {
        memEffDt: state.members[i].mem_eff_dt,
        memExpDt: state.members[i].mem_exp_dt,
        memStatus: state.members[i].mem_status,
        lineUserId: state.members[i].line_user_id
      };
    }

    function findSavingsByMember(memCode) {
      return byMember(state.savings, memCode);
    }

    function findLoansByMember(memCode) {
      return byMember(state.loans, memCode);
    }

    function findDividendsByMember(memCode) {
      return byMember(state.dividends, memCode);
    }

    function appendLog(collection, entry, prefix) {
      const row = Object.assign({}, clone(entry || {}), {
        log_id: (entry && entry.log_id) || (prefix + '-' + String(collection.length + 1).padStart(4, '0')),
        status: (entry && entry.status) || 'ok'
      });
      collection.push(row);
      return clone(row);
    }

    function logActivation(entry) {
      return appendLog(state.activationLogs, entry, 'ACT');
    }

    function listMembers() {
      return state.members.map((m, i) => withRow(m, i));
    }

    function logExpiry(entry) {
      return appendLog(state.expiryLogs, entry, 'EXP');
    }

    function saveRenewal(rowIndex, renewal) {
      const i = Number(rowIndex) - 2;
      if (i < 0 || i >= state.members.length) {
        throw new Error('Member row not found: ' + rowIndex);
      }
      const r = clone(renewal || {});
      state.members[i].mem_exp_dt = r.memExpDt;
      state.members[i].mem_status = r.memStatus;
      return {
        memExpDt: state.members[i].mem_exp_dt,
        memStatus: state.members[i].mem_status
      };
    }

    function listNotices() {
      return clone(state.notices);
    }

    function markNoticeSent(noticeId, sentDt) {
      const item = state.notices.find(n => String(n.notice_id || '') === String(noticeId || ''));
      if (!item) return false;
      item.sent_dt = sentDt instanceof Date ? sentDt.toISOString() : sentDt;
      item.sent = true;
      return true;
    }

    function listLoans() {
      return clone(state.loans);
    }

    function logReminder(entry) {
      return appendLog(state.reminderLogs, entry, 'REM');
    }

    function getContent(key) {
      return Object.prototype.hasOwnProperty.call(state.content, key)
        ? clone(state.content[key])
        : null;
    }

    function reset() {
      state = makeState();
    }

    function snapshot() {
      return clone(state);
    }

    const repo = {
      findByLineUserId,
      findByMemberCode,
      findByActivateCode,
      activateMember,
      saveActivation,
      findSavingsByMember,
      findLoansByMember,
      findDividendsByMember,
      logActivation,
      listMembers,
      logExpiry,
      saveRenewal,
      listNotices,
      markNoticeSent,
      listLoans,
      logReminder,
      getContent,
      reset,
      snapshot
    };

    Ports.MemberRepositoryPort.assertImplemented(repo);
    return Object.freeze(repo);
  }

  return { create };
})();
