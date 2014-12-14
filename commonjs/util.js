"use strict";

// A bunch of helper functions.


function isUpperCase(char) {
  return char.toUpperCase() === char;
}


function isClass(clsOrFunction) {
  if (clsOrFunction.name) {
    return isUpperCase(clsOrFunction.name.charAt(0));
  }

  return Object.keys(clsOrFunction.prototype).length > 0;
}


function isFunction(value) {
  return typeof value === "function";
}


function isObject(value) {
  return typeof value === "object";
}


function toString(token) {
  if (typeof token === "string") {
    return token;
  }

  if (token === undefined || token === null) {
    return "" + token;
  }

  if (token.name) {
    return token.name;
  }

  return token.toString();
}


exports.isUpperCase = isUpperCase;
exports.isClass = isClass;
exports.isFunction = isFunction;
exports.isObject = isObject;
exports.toString = toString;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFHQSxTQUFTLFdBQVcsQ0FBQyxJQUFJLEVBQUU7QUFDekIsU0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssSUFBSSxDQUFDO0NBQ3BDOzs7QUFHRCxTQUFTLE9BQU8sQ0FBQyxhQUFhLEVBQUU7QUFDOUIsTUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFO0FBQ3RCLFdBQU8sV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDbEQ7O0FBRUQsU0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0NBQ3hEOzs7QUFHRCxTQUFTLFVBQVUsQ0FBQyxLQUFLLEVBQUU7QUFDekIsU0FBTyxPQUFPLEtBQUssS0FBSyxVQUFVLENBQUM7Q0FDcEM7OztBQUdELFNBQVMsUUFBUSxDQUFDLEtBQUssRUFBRTtBQUN2QixTQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQztDQUNsQzs7O0FBR0QsU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFO0FBQ3ZCLE1BQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO0FBQzdCLFdBQU8sS0FBSyxDQUFDO0dBQ2Q7O0FBRUQsTUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7QUFDekMsV0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDO0dBQ25COztBQUVELE1BQUksS0FBSyxDQUFDLElBQUksRUFBRTtBQUNkLFdBQU8sS0FBSyxDQUFDLElBQUksQ0FBQztHQUNuQjs7QUFFRCxTQUFPLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztDQUN6Qjs7O1FBSUMsV0FBVyxHQUFYLFdBQVc7UUFDWCxPQUFPLEdBQVAsT0FBTztRQUNQLFVBQVUsR0FBVixVQUFVO1FBQ1YsUUFBUSxHQUFSLFFBQVE7UUFDUixRQUFRLEdBQVIsUUFBUSIsImZpbGUiOiJ1dGlsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQSBidW5jaCBvZiBoZWxwZXIgZnVuY3Rpb25zLlxuXG5cbmZ1bmN0aW9uIGlzVXBwZXJDYXNlKGNoYXIpIHtcbiAgcmV0dXJuIGNoYXIudG9VcHBlckNhc2UoKSA9PT0gY2hhcjtcbn1cblxuXG5mdW5jdGlvbiBpc0NsYXNzKGNsc09yRnVuY3Rpb24pIHtcbiAgaWYgKGNsc09yRnVuY3Rpb24ubmFtZSkge1xuICAgIHJldHVybiBpc1VwcGVyQ2FzZShjbHNPckZ1bmN0aW9uLm5hbWUuY2hhckF0KDApKTtcbiAgfVxuXG4gIHJldHVybiBPYmplY3Qua2V5cyhjbHNPckZ1bmN0aW9uLnByb3RvdHlwZSkubGVuZ3RoID4gMDtcbn1cblxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cblxuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCc7XG59XG5cblxuZnVuY3Rpb24gdG9TdHJpbmcodG9rZW4pIHtcbiAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdG9rZW47XG4gIH1cblxuICBpZiAodG9rZW4gPT09IHVuZGVmaW5lZCB8fCB0b2tlbiA9PT0gbnVsbCkge1xuICAgIHJldHVybiAnJyArIHRva2VuO1xuICB9XG5cbiAgaWYgKHRva2VuLm5hbWUpIHtcbiAgICByZXR1cm4gdG9rZW4ubmFtZTtcbiAgfVxuXG4gIHJldHVybiB0b2tlbi50b1N0cmluZygpO1xufVxuXG5cbmV4cG9ydCB7XG4gIGlzVXBwZXJDYXNlLFxuICBpc0NsYXNzLFxuICBpc0Z1bmN0aW9uLFxuICBpc09iamVjdCxcbiAgdG9TdHJpbmdcbn07XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=