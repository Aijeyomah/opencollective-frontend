import { get, isNull, merge, omit, omitBy } from 'lodash';
import memoizeOne from 'memoize-one';

import { CollectiveType } from '../constants/collectives';

const { ORGANIZATION } = CollectiveType;

export const getPayoutProfiles = memoizeOne(loggedInAccount => {
  if (!loggedInAccount) {
    return [];
  } else {
    const payoutProfiles = [loggedInAccount];
    for (const membership of get(loggedInAccount, 'adminMemberships.nodes', [])) {
      if (
        // Organizations
        [ORGANIZATION].includes(membership.account.type) ||
        // Relax available accounts
        membership.account.isActive
      ) {
        // Push main account
        payoutProfiles.push(omit(membership.account, ['childrenAccounts']));
        // Push children and add Host if missing
        for (const childrenAccount of membership.account.childrenAccounts.nodes) {
          if (childrenAccount.isActive) {
            payoutProfiles.push({ host: membership.account.host, ...childrenAccount });
          }
        }
      }
    }
    return payoutProfiles;
  }
});

export const DEFAULT_SUPPORTED_EXPENSE_TYPES = { GRANT: false, INVOICE: true, RECEIPT: true };

export const getSupportedExpenseTypes = account => {
  if (!account) {
    return [];
  }

  const host = account.host;
  const parent = account.parent || account.parentCollective;
  if (account.supportedExpenseTypes || parent?.supportedExpenseTypes) {
    // Easy case: the account uses the new supportedExpenseTypes field
    return account.supportedExpenseTypes || parent.supportedExpenseTypes;
  } else {
    // Aggregate all configs, using the order of priority collective > parent > host
    const getExpenseTypes = account => omitBy(account?.settings?.expenseTypes, isNull);
    const defaultExpenseTypes = DEFAULT_SUPPORTED_EXPENSE_TYPES;
    const aggregatedConfig = merge(defaultExpenseTypes, ...[host, parent, account].map(getExpenseTypes));
    return Object.keys(aggregatedConfig).filter(key => aggregatedConfig[key]); // Return only the truthy ones
  }
};

/**
 * Helper to determine whether an expense type is supported by an account
 */
export const isSupportedExpenseType = (account, expenseType) => {
  const supportedTypes = getSupportedExpenseTypes(account);
  return supportedTypes.includes(expenseType);
};
