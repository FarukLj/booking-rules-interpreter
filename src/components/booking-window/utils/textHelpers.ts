
export const getUserGroupText = (userScope: string) => {
  switch (userScope) {
    case "all_users": return "all users";
    case "users_with_tags": return "users with any of the tags";
    case "users_with_no_tags": return "users with none of the tags";
    default: return "all users";
  }
};

export const getConstraintText = (constraint: string) => {
  switch (constraint) {
    case "less_than": return "less than";
    case "more_than": return "more than";
    default: return "less_than";
  }
};
