export const leetcodeProblems = [
  // ==================== EASY PROBLEMS (1 - 50) ====================
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    acceptance: "52.3%",
    slug: "two-sum",
    solution: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`
  },
  {
    id: 9,
    title: "Palindrome Number",
    difficulty: "Easy",
    tags: ["Math"],
    acceptance: "55.8%",
    slug: "palindrome-number",
    solution: `function isPalindrome(x) {
  if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
  let revertedNumber = 0;
  while (x > revertedNumber) {
    revertedNumber = revertedNumber * 10 + x % 10;
    x = Math.floor(x / 10);
  }
  return x === revertedNumber || x === Math.floor(revertedNumber / 10);
}`
  },
  {
    id: 13,
    title: "Roman to Integer",
    difficulty: "Easy",
    tags: ["Hash Table", "Math", "String"],
    acceptance: "61.2%",
    slug: "roman-to-integer",
    solution: `function romanToInt(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const current = map[s[i]];
    const next = map[s[i+1]];
    if (next && current < next) {
      total -= current;
    } else {
      total += current;
    }
  }
  return total;
}`
  },
  {
    id: 14,
    title: "Longest Common Prefix",
    difficulty: "Easy",
    tags: ["String", "Trie"],
    acceptance: "43.1%",
    slug: "longest-common-prefix",
    solution: `function longestCommonPrefix(strs) {
  if (!strs.length) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (!prefix) return "";
    }
  }
  return prefix;
}`
  },
  {
    id: 20,
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    acceptance: "41.0%",
    slug: "valid-parentheses",
    solution: `function isValid(s) {
  const stack = [];
  const map = { '(': ')', '{': '}', '[': ']' };
  for (let char of s) {
    if (map[char]) {
      stack.push(map[char]);
    } else if (stack.pop() !== char) {
      return false;
    }
  }
  return stack.length === 0;
}`
  },
  {
    id: 21,
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    tags: ["Linked List", "Recursion"],
    acceptance: "64.2%",
    slug: "merge-two-sorted-lists",
    solution: `function mergeTwoLists(list1, list2) {
  if (!list1) return list2;
  if (!list2) return list1;
  if (list1.val < list2.val) {
    list1.next = mergeTwoLists(list1.next, list2);
    return list1;
  } else {
    list2.next = mergeTwoLists(list1, list2.next);
    return list2;
  }
}`
  },
  {
    id: 26,
    title: "Remove Duplicates from Sorted Array",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers"],
    acceptance: "54.8%",
    slug: "remove-duplicates-from-sorted-array",
    solution: `function removeDuplicates(nums) {
  if (nums.length === 0) return 0;
  let i = 0;
  for (let j = 1; j < nums.length; j++) {
    if (nums[j] !== nums[i]) {
      i++;
      nums[i] = nums[j];
    }
  }
  return i + 1;
}`
  },
  {
    id: 27,
    title: "Remove Element",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers"],
    acceptance: "56.4%",
    slug: "remove-element",
    solution: `function removeElement(nums, val) {
  let i = 0;
  for (let j = 0; j < nums.length; j++) {
    if (nums[j] !== val) {
      nums[i] = nums[j];
      i++;
    }
  }
  return i;
}`
  },
  {
    id: 28,
    title: "Find the Index of the First Occurrence in a String",
    difficulty: "Easy",
    tags: ["Two Pointers", "String", "String Matching"],
    acceptance: "42.5%",
    slug: "find-the-index-of-the-first-occurrence-in-a-string",
    solution: `function strStr(haystack, needle) {
  return haystack.indexOf(needle);
}`
  },
  {
    id: 35,
    title: "Search Insert Position",
    difficulty: "Easy",
    tags: ["Array", "Binary Search"],
    acceptance: "46.2%",
    slug: "search-insert-position",
    solution: `function searchInsert(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return left;
}`
  },
  {
    id: 58,
    title: "Length of Last Word",
    difficulty: "Easy",
    tags: ["String"],
    acceptance: "50.1%",
    slug: "length-of-last-word",
    solution: `function lengthOfLastWord(s) {
  const trimmed = s.trim();
  return trimmed.length - trimmed.lastIndexOf(' ') - 1;
}`
  },
  {
    id: 66,
    title: "Plus One",
    difficulty: "Easy",
    tags: ["Array", "Math"],
    acceptance: "44.9%",
    slug: "plus-one",
    solution: `function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] < 9) {
      digits[i]++;
      return digits;
    }
    digits[i] = 0;
  }
  digits.unshift(1);
  return digits;
}`
  },
  {
    id: 67,
    title: "Add Binary",
    difficulty: "Easy",
    tags: ["Math", "String", "Simulation"],
    acceptance: "53.8%",
    slug: "add-binary",
    solution: `function addBinary(a, b) {
  let res = "";
  let i = a.length - 1, j = b.length - 1, carry = 0;
  while (i >= 0 || j >= 0 || carry > 0) {
    let sum = carry;
    if (i >= 0) sum += parseInt(a[i--]);
    if (j >= 0) sum += parseInt(b[j--]);
    res = (sum % 2) + res;
    carry = Math.floor(sum / 2);
  }
  return res;
}`
  },
  {
    id: 69,
    title: "Sqrt(x)",
    difficulty: "Easy",
    tags: ["Math", "Binary Search"],
    acceptance: "38.9%",
    slug: "sqrtx",
    solution: `function mySqrt(x) {
  if (x < 2) return x;
  let left = 2, right = Math.floor(x / 2);
  while (left <= right) {
    const pivot = Math.floor((left + right) / 2);
    const num = pivot * pivot;
    if (num > x) right = pivot - 1;
    else if (num < x) left = pivot + 1;
    else return pivot;
  }
  return right;
}`
  },
  {
    id: 70,
    title: "Climbing Stairs",
    difficulty: "Easy",
    tags: ["Math", "Dynamic Programming", "Memoization"],
    acceptance: "52.9%",
    slug: "climbing-stairs",
    solution: `function climbStairs(n) {
  if (n <= 2) return n;
  let first = 1, second = 2;
  for (let i = 3; i <= n; i++) {
    const third = first + second;
    first = second;
    second = third;
  }
  return second;
}`
  },
  {
    id: 83,
    title: "Remove Duplicates from Sorted List",
    difficulty: "Easy",
    tags: ["Linked List"],
    acceptance: "52.0%",
    slug: "remove-duplicates-from-sorted-list",
    solution: `function deleteDuplicates(head) {
  let curr = head;
  while (curr && curr.next) {
    if (curr.val === curr.next.val) {
      curr.next = curr.next.next;
    } else {
      curr = curr.next;
    }
  }
  return head;
}`
  },
  {
    id: 88,
    title: "Merge Sorted Array",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers", "Sorting"],
    acceptance: "49.2%",
    slug: "merge-sorted-array",
    solution: `function merge(nums1, m, nums2, n) {
  let p1 = m - 1, p2 = n - 1, p = m + n - 1;
  while (p1 >= 0 && p2 >= 0) {
    if (nums1[p1] > nums2[p2]) {
      nums1[p] = nums1[p1];
      p1--;
    } else {
      nums1[p] = nums2[p2];
      p2--;
    }
    p--;
  }
  while (p2 >= 0) {
    nums1[p] = nums2[p2];
    p2--;
    p--;
  }
}`
  },
  {
    id: 94,
    title: "Binary Tree Inorder Traversal",
    difficulty: "Easy",
    tags: ["Stack", "Tree", "Depth-First Search", "Binary Tree"],
    acceptance: "76.4%",
    slug: "binary-tree-inorder-traversal",
    solution: `function inorderTraversal(root) {
  const res = [];
  function helper(node) {
    if (node) {
      helper(node.left);
      res.push(node.val);
      helper(node.right);
    }
  }
  helper(root);
  return res;
}`
  },
  {
    id: 100,
    title: "Same Tree",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    acceptance: "60.5%",
    slug: "same-tree",
    solution: `function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q) return false;
  if (p.val !== q.val) return false;
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`
  },
  {
    id: 101,
    title: "Symmetric Tree",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    acceptance: "55.8%",
    slug: "symmetric-tree",
    solution: `function isSymmetric(root) {
  if (!root) return true;
  function isMirror(t1, t2) {
    if (!t1 && !t2) return true;
    if (!t1 || !t2) return false;
    return (t1.val === t2.val) && isMirror(t1.left, t2.right) && isMirror(t1.right, t2.left);
  }
  return isMirror(root.left, root.right);
}`
  },
  {
    id: 104,
    title: "Maximum Depth of Binary Tree",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    acceptance: "74.9%",
    slug: "maximum-depth-of-binary-tree",
    solution: `function maxDepth(root) {
  if (!root) return 0;
  return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;
}`
  },
  {
    id: 108,
    title: "Convert Sorted Array to Binary Search Tree",
    difficulty: "Easy",
    tags: ["Array", "Divide and Conquer", "Tree", "Binary Search Tree", "Binary Tree"],
    acceptance: "71.3%",
    slug: "convert-sorted-array-to-binary-search-tree",
    solution: `function sortedArrayToBST(nums) {
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  const root = new TreeNode(nums[mid]);
  root.left = sortedArrayToBST(nums.slice(0, mid));
  root.right = sortedArrayToBST(nums.slice(mid + 1));
  return root;
}`
  },
  {
    id: 110,
    title: "Balanced Binary Tree",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Binary Tree"],
    acceptance: "51.2%",
    slug: "balanced-binary-tree",
    solution: `function isBalanced(root) {
  function checkHeight(node) {
    if (!node) return 0;
    const leftHeight = checkHeight(node.left);
    if (leftHeight === -1) return -1;
    const rightHeight = checkHeight(node.right);
    if (rightHeight === -1) return -1;
    if (Math.abs(leftHeight - rightHeight) > 1) return -1;
    return Math.max(leftHeight, rightHeight) + 1;
  }
  return checkHeight(root) !== -1;
}`
  },
  {
    id: 111,
    title: "Minimum Depth of Binary Tree",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    acceptance: "46.9%",
    slug: "minimum-depth-of-binary-tree",
    solution: `function minDepth(root) {
  if (!root) return 0;
  if (!root.left) return minDepth(root.right) + 1;
  if (!root.right) return minDepth(root.left) + 1;
  return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
}`
  },
  {
    id: 112,
    title: "Path Sum",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    acceptance: "49.8%",
    slug: "path-sum",
    solution: `function hasPathSum(root, targetSum) {
  if (!root) return false;
  if (!root.left && !root.right) return targetSum === root.val;
  return hasPathSum(root.left, targetSum - root.val) || hasPathSum(root.right, targetSum - root.val);
}`
  },
  {
    id: 118,
    title: "Pascal's Triangle",
    difficulty: "Easy",
    tags: ["Array", "Dynamic Programming"],
    acceptance: "73.2%",
    slug: "pascals-triangle",
    solution: `function generate(numRows) {
  const triangle = [];
  for (let i = 0; i < numRows; i++) {
    const row = new Array(i + 1).fill(1);
    for (let j = 1; j < i; j++) {
      row[j] = triangle[i-1][j-1] + triangle[i-1][j];
    }
    triangle.push(row);
  }
  return triangle;
}`
  },
  {
    id: 119,
    title: "Pascal's Triangle II",
    difficulty: "Easy",
    tags: ["Array", "Dynamic Programming"],
    acceptance: "63.5%",
    slug: "pascals-triangle-ii",
    solution: `function getRow(rowIndex) {
  const row = new Array(rowIndex + 1).fill(1);
  for (let i = 1; i < rowIndex; i++) {
    for (let j = i; j > 0; j--) {
      row[j] = row[j] + row[j-1];
    }
  }
  return row;
}`
  },
  {
    id: 121,
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    tags: ["Array", "Dynamic Programming"],
    acceptance: "54.8%",
    slug: "best-time-to-buy-and-sell-stock",
    solution: `function maxProfit(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] < minPrice) {
      minPrice = prices[i];
    } else if (prices[i] - minPrice > maxProfit) {
      maxProfit = prices[i] - minPrice;
    }
  }
  return maxProfit;
}`
  },
  {
    id: 125,
    title: "Valid Palindrome",
    difficulty: "Easy",
    tags: ["Two Pointers", "String"],
    acceptance: "47.1%",
    slug: "valid-palindrome",
    solution: `function isPalindrome(s) {
  const clean = s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  let left = 0, right = clean.length - 1;
  while (left < right) {
    if (clean[left] !== clean[right]) return false;
    left++;
    right--;
  }
  return true;
}`
  },
  {
    id: 136,
    title: "Single Number",
    difficulty: "Easy",
    tags: ["Array", "Bit Manipulation"],
    acceptance: "72.4%",
    slug: "single-number",
    solution: `function singleNumber(nums) {
  let a = 0;
  for (let i of nums) {
    a ^= i;
  }
  return a;
}`
  },
  {
    id: 141,
    title: "Linked List Cycle",
    difficulty: "Easy",
    tags: ["Hash Table", "Linked List", "Two Pointers"],
    acceptance: "49.1%",
    slug: "linked-list-cycle",
    solution: `function hasCycle(head) {
  if (!head || !head.next) return false;
  let slow = head;
  let fast = head.next;
  while (slow !== fast) {
    if (!fast || !fast.next) return false;
    slow = slow.next;
    fast = fast.next.next;
  }
  return true;
}`
  },
  {
    id: 144,
    title: "Binary Tree Preorder Traversal",
    difficulty: "Easy",
    tags: ["Stack", "Tree", "Depth-First Search", "Binary Tree"],
    acceptance: "68.2%",
    slug: "binary-tree-preorder-traversal",
    solution: `function preorderTraversal(root) {
  const res = [];
  function helper(node) {
    if (node) {
      res.push(node.val);
      helper(node.left);
      helper(node.right);
    }
  }
  helper(root);
  return res;
}`
  },
  {
    id: 145,
    title: "Binary Tree Postorder Traversal",
    difficulty: "Easy",
    tags: ["Stack", "Tree", "Depth-First Search", "Binary Tree"],
    acceptance: "70.1%",
    slug: "binary-tree-postorder-traversal",
    solution: `function postorderTraversal(root) {
  const res = [];
  function helper(node) {
    if (node) {
      helper(node.left);
      helper(node.right);
      res.push(node.val);
    }
  }
  helper(root);
  return res;
}`
  },
  {
    id: 155,
    title: "Min Stack",
    difficulty: "Easy",
    tags: ["Stack", "Design"],
    acceptance: "53.2%",
    slug: "min-stack",
    solution: `class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];
  }
  push(val) {
    this.stack.push(val);
    if (!this.minStack.length || val <= this.minStack[this.minStack.length - 1]) {
      this.minStack.push(val);
    }
  }
  pop() {
    const val = this.stack.pop();
    if (val === this.minStack[this.minStack.length - 1]) {
      this.minStack.pop();
    }
  }
  top() {
    return this.stack[this.stack.length - 1];
  }
  getMin() {
    return this.minStack[this.minStack.length - 1];
  }
}`
  },
  {
    id: 160,
    title: "Intersection of Two Linked Lists",
    difficulty: "Easy",
    tags: ["Hash Table", "Linked List", "Two Pointers"],
    acceptance: "56.4%",
    slug: "intersection-of-two-linked-lists",
    solution: `function getIntersectionNode(headA, headB) {
  if (!headA || !headB) return null;
  let pA = headA, pB = headB;
  while (pA !== pB) {
    pA = pA === null ? headB : pA.next;
    pB = pB === null ? headA : pB.next;
  }
  return pA;
}`
  },
  {
    id: 163,
    title: "Missing Ranges",
    difficulty: "Easy",
    tags: ["Array"],
    acceptance: "49.0%",
    slug: "missing-ranges",
    solution: `function findMissingRanges(nums, lower, upper) {
  const result = [];
  let next = lower;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] < next) continue;
    if (nums[i] === next) {
      next++;
      continue;
    }
    result.push([next, nums[i] - 1]);
    next = nums[i] + 1;
  }
  if (next <= upper) {
    result.push([next, upper]);
  }
  return result;
}`
  },
  {
    id: 167,
    title: "Two Sum II - Input Array Is Sorted",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers", "Binary Search"],
    acceptance: "60.8%",
    slug: "two-sum-ii-input-array-is-sorted",
    solution: `function twoSum(numbers, target) {
  let left = 0, right = numbers.length - 1;
  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) return [left + 1, right + 1];
    else if (sum < target) left++;
    else right--;
  }
  return [];
}`
  },
  {
    id: 168,
    title: "Excel Sheet Column Title",
    difficulty: "Easy",
    tags: ["Math", "String"],
    acceptance: "39.2%",
    slug: "excel-sheet-column-title",
    solution: `function convertToTitle(columnNumber) {
  let res = "";
  while (columnNumber > 0) {
    columnNumber--;
    res = String.fromCharCode(65 + (columnNumber % 26)) + res;
    columnNumber = Math.floor(columnNumber / 26);
  }
  return res;
}`
  },
  {
    id: 169,
    title: "Majority Element",
    difficulty: "Easy",
    tags: ["Array", "Hash Table", "Divide and Conquer", "Sorting", "Counting"],
    acceptance: "64.8%",
    slug: "majority-element",
    solution: `function majorityElement(nums) {
  let count = 0, candidate = null;
  for (let num of nums) {
    if (count === 0) candidate = num;
    count += (num === candidate) ? 1 : -1;
  }
  return candidate;
}`
  },
  {
    id: 171,
    title: "Excel Sheet Column Number",
    difficulty: "Easy",
    tags: ["Math", "String"],
    acceptance: "63.2%",
    slug: "excel-sheet-column-number",
    solution: `function titleToNumber(columnTitle) {
  let number = 0;
  for (let i = 0; i < columnTitle.length; i++) {
    number = number * 26 + (columnTitle.charCodeAt(i) - 64);
  }
  return number;
}`
  },
  {
    id: 172,
    title: "Factorial Trailing Zeroes",
    difficulty: "Easy",
    tags: ["Math"],
    acceptance: "43.4%",
    slug: "factorial-trailing-zeroes",
    solution: `function trailingZeroes(n) {
  let count = 0;
  while (n > 0) {
    count += Math.floor(n / 5);
    n = Math.floor(n / 5);
  }
  return count;
}`
  },
  {
    id: 175,
    title: "Combine Two Tables",
    difficulty: "Easy",
    tags: ["Database"],
    acceptance: "75.1%",
    slug: "combine-two-tables",
    solution: `SELECT FirstName, LastName, City, State 
FROM Person LEFT JOIN Address 
ON Person.PersonId = Address.PersonId;`
  },
  {
    id: 181,
    title: "Employees Earning More Than Their Managers",
    difficulty: "Easy",
    tags: ["Database"],
    acceptance: "69.4%",
    slug: "employees-earning-more-than-their-managers",
    solution: `SELECT a.Name AS Employee 
FROM Employee AS a JOIN Employee AS b 
ON a.ManagerId = b.Id 
WHERE a.Salary > b.Salary;`
  },
  {
    id: 182,
    title: "Duplicate Emails",
    difficulty: "Easy",
    tags: ["Database"],
    acceptance: "70.2%",
    slug: "duplicate-emails",
    solution: `SELECT Email FROM Person 
GROUP BY Email 
HAVING COUNT(Email) > 1;`
  },
  {
    id: 183,
    title: "Customers Who Never Order",
    difficulty: "Easy",
    tags: ["Database"],
    acceptance: "69.9%",
    slug: "customers-who-never-order",
    solution: `SELECT Name AS Customers FROM Customers 
WHERE Id NOT IN (SELECT CustomerId FROM Orders);`
  },
  {
    id: 190,
    title: "Reverse Bits",
    difficulty: "Easy",
    tags: ["Divide and Conquer", "Bit Manipulation"],
    acceptance: "57.8%",
    slug: "reverse-bits",
    solution: `function reverseBits(n) {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1);
    n >>>= 1;
  }
  return result >>> 0;
}`
  },
  {
    id: 191,
    title: "Number of 1 Bits",
    difficulty: "Easy",
    tags: ["Divide and Conquer", "Bit Manipulation"],
    acceptance: "68.9%",
    slug: "number-of-1-bits",
    solution: `function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= (n - 1);
    count++;
  }
  return count;
}`
  },
  {
    id: 193,
    title: "Valid Phone Numbers",
    difficulty: "Easy",
    tags: ["Shell"],
    acceptance: "25.9%",
    slug: "valid-phone-numbers",
    solution: `grep -P '^(\\(\\d{3}\\) |\\d{3}-)\\d{3}-\\d{4}$' file.txt`
  },
  {
    id: 196,
    title: "Delete Duplicate Emails",
    difficulty: "Easy",
    tags: ["Database"],
    acceptance: "61.3%",
    slug: "delete-duplicate-emails",
    solution: `DELETE p1 FROM Person p1, Person p2 
WHERE p1.Email = p2.Email AND p1.Id > p2.Id;`
  },
  {
    id: 197,
    title: "Rising Temperature",
    difficulty: "Easy",
    tags: ["Database"],
    acceptance: "49.8%",
    slug: "rising-temperature",
    solution: `SELECT w1.id FROM Weather w1, Weather w2 
WHERE DATEDIFF(w1.recordDate, w2.recordDate) = 1 
AND w1.temperature > w2.temperature;`
  },

  // ==================== MEDIUM PROBLEMS (51 - 100) ====================
  {
    id: 2,
    title: "Add Two Numbers",
    difficulty: "Medium",
    tags: ["Linked List", "Math", "Recursion"],
    acceptance: "42.5%",
    slug: "add-two-numbers",
    solution: `function addTwoNumbers(l1, l2) {
  let dummy = new ListNode(0);
  let curr = dummy, carry = 0;
  while (l1 || l2 || carry) {
    let sum = carry;
    if (l1) { sum += l1.val; l1 = l1.next; }
    if (l2) { sum += l2.val; l2 = l2.next; }
    carry = Math.floor(sum / 10);
    curr.next = new ListNode(sum % 10);
    curr = curr.next;
  }
  return dummy.next;
}`
  },
  {
    id: 3,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["Hash Table", "String", "Sliding Window"],
    acceptance: "34.8%",
    slug: "longest-substring-without-repeating-characters",
    solution: `function lengthOfLongestSubstring(s) {
  let set = new Set();
  let left = 0, maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}`
  },
  {
    id: 5,
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
    tags: ["Two Pointers", "String", "Dynamic Programming"],
    acceptance: "33.6%",
    slug: "longest-palindromic-substring",
    solution: `function longestPalindrome(s) {
  if (!s || s.length < 1) return "";
  let start = 0, end = 0;
  function expandAroundCenter(left, right) {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--; right++;
    }
    return right - left - 1;
  }
  for (let i = 0; i < s.length; i++) {
    const len1 = expandAroundCenter(i, i);
    const len2 = expandAroundCenter(i, i + 1);
    const len = Math.max(len1, len2);
    if (len > end - start) {
      start = i - Math.floor((len - 1) / 2);
      end = i + Math.floor(len / 2);
    }
  }
  return s.substring(start, end + 1);
}`
  },
  {
    id: 6,
    title: "Zigzag Conversion",
    difficulty: "Medium",
    tags: ["String"],
    acceptance: "48.2%",
    slug: "zigzag-conversion",
    solution: `function convert(s, numRows) {
  if (numRows === 1 || s.length <= numRows) return s;
  const rows = Array.from({ length: numRows }, () => "");
  let curRow = 0, goingDown = false;
  for (let char of s) {
    rows[curRow] += char;
    if (curRow === 0 || curRow === numRows - 1) goingDown = !goingDown;
    curRow += goingDown ? 1 : -1;
  }
  return rows.join("");
}`
  },
  {
    id: 7,
    title: "Reverse Integer",
    difficulty: "Medium",
    tags: ["Math"],
    acceptance: "28.5%",
    slug: "reverse-integer",
    solution: `function reverse(x) {
  const limit = Math.pow(2, 31);
  const sign = x < 0 ? -1 : 1;
  const rev = parseInt(Math.abs(x).toString().split("").reverse().join("")) * sign;
  if (rev < -limit || rev > limit - 1) return 0;
  return rev;
}`
  },
  {
    id: 8,
    title: "String to Integer (atoi)",
    difficulty: "Medium",
    tags: ["String"],
    acceptance: "17.1%",
    slug: "string-to-integer-atoi",
    solution: `function myAtoi(s) {
  const match = s.trim().match(/^[-+]?\\d+/);
  if (!match) return 0;
  let num = Number(match[0]);
  const min = -Math.pow(2, 31);
  const max = Math.pow(2, 31) - 1;
  return Math.max(min, Math.min(max, num));
}`
  },
  {
    id: 11,
    title: "Container With Most Water",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Greedy"],
    acceptance: "54.9%",
    slug: "container-with-most-water",
    solution: `function maxArea(height) {
  let max = 0, left = 0, right = height.length - 1;
  while (left < right) {
    const minHeight = Math.min(height[left], height[right]);
    max = Math.max(max, minHeight * (right - left));
    if (height[left] < height[right]) left++;
    else right--;
  }
  return max;
}`
  },
  {
    id: 12,
    title: "Integer to Roman",
    difficulty: "Medium",
    tags: ["Hash Table", "Math", "String"],
    acceptance: "64.1%",
    slug: "integer-to-roman",
    solution: `function intToRoman(num) {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let res = "";
  for (let i = 0; i < values.length && num > 0; i++) {
    while (num >= values[i]) {
      num -= values[i];
      res += symbols[i];
    }
  }
  return res;
}`
  },
  {
    id: 15,
    title: "3Sum",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Sorting"],
    acceptance: "34.5%",
    slug: "3sum",
    solution: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) {
        res.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;
        while (l < r && nums[r] === nums[r - 1]) r--;
        l++; r--;
      } else if (sum < 0) l++;
      else r--;
    }
  }
  return res;
}`
  },
  {
    id: 16,
    title: "3Sum Closest",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Sorting"],
    acceptance: "45.9%",
    slug: "3sum-closest",
    solution: `function threeSumClosest(nums, target) {
  nums.sort((a, b) => a - b);
  let closest = nums[0] + nums[1] + nums[2];
  for (let i = 0; i < nums.length - 2; i++) {
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (Math.abs(target - sum) < Math.abs(target - closest)) {
        closest = sum;
      }
      if (sum < target) l++;
      else r--;
    }
  }
  return closest;
}`
  },
  {
    id: 17,
    title: "Letter Combinations of a Phone Number",
    difficulty: "Medium",
    tags: ["Hash Table", "String", "Backtracking"],
    acceptance: "59.2%",
    slug: "letter-combinations-of-a-phone-number",
    solution: `function letterCombinations(digits) {
  if (!digits) return [];
  const map = { 
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', 
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz' 
  };
  const res = [];
  function backtrack(idx, str) {
    if (str.length === digits.length) {
      res.push(str);
      return;
    }
    const letters = map[digits[idx]];
    for (let char of letters) {
      backtrack(idx + 1, str + char);
    }
  }
  backtrack(0, "");
  return res;
}`
  },
  {
    id: 19,
    title: "Remove Nth Node From End of List",
    difficulty: "Medium",
    tags: ["Linked List", "Two Pointers"],
    acceptance: "44.9%",
    slug: "remove-nth-node-from-end-of-list",
    solution: `function removeNthFromEnd(head, n) {
  let dummy = new ListNode(0, head);
  let first = dummy, second = dummy;
  for (let i = 0; i <= n; i++) { first = first.next; }
  while (first) {
    first = first.next;
    second = second.next;
  }
  second.next = second.next.next;
  return dummy.next;
}`
  },
  {
    id: 22,
    title: "Generate Parentheses",
    difficulty: "Medium",
    tags: ["String", "Dynamic Programming", "Backtracking"],
    acceptance: "73.8%",
    slug: "generate-parentheses",
    solution: `function generateParenthesis(n) {
  const res = [];
  function backtrack(str, open, close) {
    if (str.length === n * 2) {
      res.push(str);
      return;
    }
    if (open < n) backtrack(str + "(", open + 1, close);
    if (close < open) backtrack(str + ")", open, close + 1);
  }
  backtrack("", 0, 0);
  return res;
}`
  },
  {
    id: 24,
    title: "Swap Nodes in Pairs",
    difficulty: "Medium",
    tags: ["Linked List", "Recursion"],
    acceptance: "63.9%",
    slug: "swap-nodes-in-pairs",
    solution: `function swapPairs(head) {
  if (!head || !head.next) return head;
  let temp = head.next;
  head.next = swapPairs(temp.next);
  temp.next = head;
  return temp;
}`
  },
  {
    id: 29,
    title: "Divide Two Integers",
    difficulty: "Medium",
    tags: ["Math", "Bit Manipulation"],
    acceptance: "21.0%",
    slug: "divide-two-integers",
    solution: `function divide(dividend, divisor) {
  if (dividend === -2147483648 && divisor === -1) return 2147483647;
  const isNegative = (dividend < 0) !== (divisor < 0);
  let a = Math.abs(dividend);
  let b = Math.abs(divisor);
  let res = 0;
  while (a >= b) {
    let temp = b, mul = 1;
    while (a >= (temp << 1) && (temp << 1) > 0) {
      temp <<= 1;
      mul <<= 1;
    }
    a -= temp;
    res += mul;
  }
  return isNegative ? -res : res;
}`
  },
  {
    id: 31,
    title: "Next Permutation",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers"],
    acceptance: "40.5%",
    slug: "next-permutation",
    solution: `function nextPermutation(nums) {
  let i = nums.length - 2;
  while (i >= 0 && nums[i] >= nums[i+1]) i--;
  if (i >= 0) {
    let j = nums.length - 1;
    while (nums[j] <= nums[i]) j--;
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  nums.splice(i + 1, nums.length - i - 1, ...nums.slice(i + 1).reverse());
}`
  },
  {
    id: 33,
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    tags: ["Array", "Binary Search"],
    acceptance: "40.9%",
    slug: "search-in-rotated-sorted-array",
    solution: `function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) return mid;
    if (nums[l] <= nums[mid]) {
      if (nums[l] <= target && target < nums[mid]) r = mid - 1;
      else l = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[r]) l = mid + 1;
      else r = mid - 1;
    }
  }
  return -1;
}`
  },
  {
    id: 34,
    title: "Find First and Last Position of Element in Sorted Array",
    difficulty: "Medium",
    tags: ["Array", "Binary Search"],
    acceptance: "43.5%",
    slug: "find-first-and-last-position-of-element-in-sorted-array",
    solution: `function searchRange(nums, target) {
  function find(isFirst) {
    let l = 0, r = nums.length - 1, ans = -1;
    while (l <= r) {
      const mid = Math.floor((l + r) / 2);
      if (nums[mid] === target) {
        ans = mid;
        if (isFirst) r = mid - 1;
        else l = mid + 1;
      } else if (nums[mid] < target) l = mid + 1;
      else r = mid - 1;
    }
    return ans;
  }
  return [find(true), find(false)];
}`
  },
  {
    id: 36,
    title: "Valid Sudoku",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "Matrix"],
    acceptance: "58.9%",
    slug: "valid-sudoku",
    solution: `function isValidSudoku(board) {
  const seen = new Set();
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const char = board[i][j];
      if (char !== '.') {
        const row = \`\${char} in row \${i}\`;
        const col = \`\${char} in col \${j}\`;
        const box = \`\${char} in box \${Math.floor(i/3)}-\${Math.floor(j/3)}\`;
        if (seen.has(row) || seen.has(col) || seen.has(box)) return false;
        seen.add(row); seen.add(col); seen.add(box);
      }
    }
  }
  return true;
}`
  },
  {
    id: 38,
    title: "Count and Say",
    difficulty: "Medium",
    tags: ["String"],
    acceptance: "54.1%",
    slug: "count-and-say",
    solution: `function countAndSay(n) {
  let s = "1";
  for (let i = 2; i <= n; i++) {
    let next = "", count = 1;
    for (let j = 0; j < s.length; j++) {
      if (s[j] === s[j+1]) {
        count++;
      } else {
        next += count + s[j];
        count = 1;
      }
    }
    s = next;
  }
  return s;
}`
  },
  {
    id: 39,
    title: "Combination Sum",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    acceptance: "70.1%",
    slug: "combination-sum",
    solution: `function combinationSum(candidates, target) {
  const res = [];
  function backtrack(idx, path, sum) {
    if (sum === target) { res.push([...path]); return; }
    if (sum > target) return;
    for (let i = idx; i < candidates.length; i++) {
      path.push(candidates[i]);
      backtrack(i, path, sum + candidates[i]);
      path.pop();
    }
  }
  backtrack(0, [], 0);
  return res;
}`
  },
  {
    id: 40,
    title: "Combination Sum II",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    acceptance: "54.3%",
    slug: "combination-sum-ii",
    solution: `function combinationSum2(candidates, target) {
  candidates.sort((a, b) => a - b);
  const res = [];
  function backtrack(idx, path, sum) {
    if (sum === target) { res.push([...path]); return; }
    if (sum > target) return;
    for (let i = idx; i < candidates.length; i++) {
      if (i > idx && candidates[i] === candidates[i - 1]) continue;
      path.push(candidates[i]);
      backtrack(i + 1, path, sum + candidates[i]);
      path.pop();
    }
  }
  backtrack(0, [], 0);
  return res;
}`
  },
  {
    id: 43,
    title: "Multiply Strings",
    difficulty: "Medium",
    tags: ["Math", "String", "Simulation"],
    acceptance: "40.2%",
    slug: "multiply-strings",
    solution: `function multiply(num1, num2) {
  if (num1 === "0" || num2 === "0") return "0";
  const m = num1.length, n = num2.length;
  const pos = new Array(m + n).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const mul = parseInt(num1[i]) * parseInt(num2[j]);
      const sum = mul + pos[i+j+1];
      pos[i+j+1] = sum % 10;
      pos[i+j] += Math.floor(sum / 10);
    }
  }
  let res = pos.join("");
  return res.startsWith("0") ? res.substring(1) : res;
}`
  },
  {
    id: 45,
    title: "Jump Game II",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Greedy"],
    acceptance: "40.5%",
    slug: "jump-game-ii",
    solution: `function jump(nums) {
  let jumps = 0, curEnd = 0, curFarthest = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    curFarthest = Math.max(curFarthest, i + nums[i]);
    if (i === curEnd) {
      jumps++;
      curEnd = curFarthest;
    }
  }
  return jumps;
}`
  },
  {
    id: 46,
    title: "Permutations",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    acceptance: "78.2%",
    slug: "permutations",
    solution: `function permute(nums) {
  const res = [];
  function backtrack(path, used) {
    if (path.length === nums.length) { res.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      path.push(nums[i]);
      used[i] = true;
      backtrack(path, used);
      path.pop();
      used[i] = false;
    }
  }
  backtrack([], new Array(nums.length).fill(false));
  return res;
}`
  },
  {
    id: 47,
    title: "Permutations II",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    acceptance: "58.9%",
    slug: "permutations-ii",
    solution: `function permuteUnique(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  function backtrack(path, used) {
    if (path.length === nums.length) { res.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i] || (i > 0 && nums[i] === nums[i - 1] && !used[i - 1])) continue;
      path.push(nums[i]);
      used[i] = true;
      backtrack(path, used);
      path.pop();
      used[i] = false;
    }
  }
  backtrack([], new Array(nums.length).fill(false));
  return res;
}`
  },
  {
    id: 48,
    title: "Rotate Image",
    difficulty: "Medium",
    tags: ["Array", "Math", "Matrix"],
    acceptance: "73.5%",
    slug: "rotate-image",
    solution: `function rotate(matrix) {
  const n = matrix.length;
  // Transpose matrix
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }
  // Reverse each row
  for (let i = 0; i < n; i++) {
    matrix[i].reverse();
  }
}`
  },
  {
    id: 49,
    title: "Group Anagrams",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "String", "Sorting"],
    acceptance: "68.2%",
    slug: "group-anagrams",
    solution: `function groupAnagrams(strs) {
  const map = {};
  for (let s of strs) {
    const key = s.split("").sort().join("");
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return Object.values(map);
}`
  },
  {
    id: 50,
    title: "Pow(x, n)",
    difficulty: "Medium",
    tags: ["Math", "Recursion"],
    acceptance: "34.5%",
    slug: "powx-n",
    solution: `function myPow(x, n) {
  if (n === 0) return 1;
  if (n < 0) { x = 1 / x; n = -n; }
  function halfPow(val, exponent) {
    if (exponent === 0) return 1;
    const half = halfPow(val, Math.floor(exponent / 2));
    if (exponent % 2 === 0) return half * half;
    else return half * half * val;
  }
  return halfPow(x, n);
}`
  },
  {
    id: 53,
    title: "Maximum Subarray",
    difficulty: "Medium",
    tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
    acceptance: "50.4%",
    slug: "maximum-subarray",
    solution: `function maxSubArray(nums) {
  let maxSum = nums[0], curSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    curSum = Math.max(nums[i], curSum + nums[i]);
    maxSum = Math.max(maxSum, curSum);
  }
  return maxSum;
}`
  },
  {
    id: 54,
    title: "Spiral Matrix",
    difficulty: "Medium",
    tags: ["Array", "Matrix", "Simulation"],
    acceptance: "49.1%",
    slug: "spiral-matrix",
    solution: `function spiralOrder(matrix) {
  if (!matrix.length) return [];
  const res = [];
  let r1 = 0, r2 = matrix.length - 1;
  let c1 = 0, c2 = matrix[0].length - 1;
  while (r1 <= r2 && c1 <= c2) {
    for (let c = c1; c <= c2; c++) res.push(matrix[r1][c]);
    for (let r = r1 + 1; r <= r2; r++) res.push(matrix[r][c2]);
    if (r1 < r2 && c1 < c2) {
      for (let c = c2 - 1; c > c1; c--) res.push(matrix[r2][c]);
      for (let r = r2; r > r1; r--) res.push(matrix[r][c1]);
    }
    r1++; r2--; c1++; c2--;
  }
  return res;
}`
  },
  {
    id: 55,
    title: "Jump Game",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Greedy"],
    acceptance: "38.9%",
    slug: "jump-game",
    solution: `function canJump(nums) {
  let lastPos = nums.length - 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    if (i + nums[i] >= lastPos) {
      lastPos = i;
    }
  }
  return lastPos === 0;
}`
  },
  {
    id: 56,
    title: "Merge Intervals",
    difficulty: "Medium",
    tags: ["Array", "Sorting"],
    acceptance: "46.8%",
    slug: "merge-intervals",
    solution: `function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const cur = intervals[i], last = merged[merged.length - 1];
    if (cur[0] <= last[1]) {
      last[1] = Math.max(last[1], cur[1]);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}`
  },
  {
    id: 57,
    title: "Insert Interval",
    difficulty: "Medium",
    tags: ["Array"],
    acceptance: "41.2%",
    slug: "insert-interval",
    solution: `function insert(intervals, newInterval) {
  const result = [];
  let i = 0, n = intervals.length;
  while (i < n && intervals[i][1] < newInterval[0]) {
    result.push(intervals[i++]);
  }
  while (i < n && intervals[i][0] <= newInterval[1]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  result.push(newInterval);
  while (i < n) result.push(intervals[i++]);
  return result;
}`
  },
  {
    id: 59,
    title: "Spiral Matrix II",
    difficulty: "Medium",
    tags: ["Array", "Matrix", "Simulation"],
    acceptance: "70.2%",
    slug: "spiral-matrix-ii",
    solution: `function generateMatrix(n) {
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  let val = 1, r1 = 0, r2 = n - 1, c1 = 0, c2 = n - 1;
  while (r1 <= r2 && c1 <= c2) {
    for (let c = c1; c <= c2; c++) matrix[r1][c] = val++;
    for (let r = r1 + 1; r <= r2; r++) matrix[r][c2] = val++;
    if (r1 < r2 && c1 < c2) {
      for (let c = c2 - 1; c > c1; c--) matrix[r2][c] = val++;
      for (let r = r2; r > r1; r--) matrix[r][c1] = val++;
    }
    r1++; r2--; c1++; c2--;
  }
  return matrix;
}`
  },
  {
    id: 61,
    title: "Rotate List",
    difficulty: "Medium",
    tags: ["Linked List", "Two Pointers"],
    acceptance: "37.5%",
    slug: "rotate-list",
    solution: `function rotateRight(head, k) {
  if (!head || !head.next || k === 0) return head;
  let oldTail = head, n = 1;
  while (oldTail.next) { oldTail = oldTail.next; n++; }
  oldTail.next = head; // Close cycle
  let newTail = head;
  for (let i = 0; i < n - (k % n) - 1; i++) {
    newTail = newTail.next;
  }
  let newHead = newTail.next;
  newTail.next = null; // Open cycle
  return newHead;
}`
  },
  {
    id: 62,
    title: "Unique Paths",
    difficulty: "Medium",
    tags: ["Math", "Dynamic Programming", "Combinatorics"],
    acceptance: "63.8%",
    slug: "unique-paths",
    solution: `function uniquePaths(m, n) {
  const dp = new Array(n).fill(1);
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[j] += dp[j - 1];
    }
  }
  return dp[n - 1];
}`
  },
  {
    id: 63,
    title: "Unique Paths II",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Matrix"],
    acceptance: "41.5%",
    slug: "unique-paths-ii",
    solution: `function uniquePathsWithObstacles(obstacleGrid) {
  const n = obstacleGrid[0].length;
  const dp = new Array(n).fill(0);
  dp[0] = 1;
  for (let row of obstacleGrid) {
    for (let j = 0; j < n; j++) {
      if (row[j] === 1) dp[j] = 0;
      else if (j > 0) dp[j] += dp[j-1];
    }
  }
  return dp[n - 1];
}`
  },
  {
    id: 64,
    title: "Minimum Path Sum",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Matrix"],
    acceptance: "63.2%",
    slug: "minimum-path-sum",
    solution: `function minPathSum(grid) {
  const m = grid.length, n = grid[0].length;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (i === 0 && j > 0) grid[i][j] += grid[i][j-1];
      else if (i > 0 && j === 0) grid[i][j] += grid[i-1][j];
      else if (i > 0 && j > 0) grid[i][j] += Math.min(grid[i-1][j], grid[i][j-1]);
    }
  }
  return grid[m - 1][n - 1];
}`
  },
  {
    id: 71,
    title: "Simplify Path",
    difficulty: "Medium",
    tags: ["String", "Stack"],
    acceptance: "42.1%",
    slug: "simplify-path",
    solution: `function simplifyPath(path) {
  const stack = [];
  const parts = path.split("/");
  for (let part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") { stack.pop(); }
    else { stack.push(part); }
  }
  return "/" + stack.join("/");
}`
  },
  {
    id: 73,
    title: "Set Matrix Zeroes",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "Matrix"],
    acceptance: "54.8%",
    slug: "set-matrix-zeroes",
    solution: `function setZeroes(matrix) {
  let isCol = false, R = matrix.length, C = matrix[0].length;
  for (let i = 0; i < R; i++) {
    if (matrix[i][0] === 0) isCol = true;
    for (let j = 1; j < C; j++) {
      if (matrix[i][j] === 0) {
        matrix[0][j] = 0;
        matrix[i][0] = 0;
      }
    }
  }
  for (let i = 1; i < R; i++) {
    for (let j = 1; j < C; j++) {
      if (matrix[i][0] === 0 || matrix[0][j] === 0) matrix[i][j] = 0;
    }
  }
  if (matrix[0][0] === 0) {
    for (let j = 0; j < C; j++) matrix[0][j] = 0;
  }
  if (isCol) {
    for (let i = 0; i < R; i++) matrix[i][0] = 0;
  }
}`
  },
  {
    id: 74,
    title: "Search a 2D Matrix",
    difficulty: "Medium",
    tags: ["Array", "Binary Search", "Matrix"],
    acceptance: "49.5%",
    slug: "search-a-2d-matrix",
    solution: `function searchMatrix(matrix, target) {
  const m = matrix.length, n = matrix[0].length;
  let l = 0, r = m * n - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    const midVal = matrix[Math.floor(mid / n)][mid % n];
    if (midVal === target) return true;
    else if (midVal < target) l = mid + 1;
    else r = mid - 1;
  }
  return false;
}`
  },
  {
    id: 75,
    title: "Sort Colors",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Sorting"],
    acceptance: "61.3%",
    slug: "sort-colors",
    solution: `function sortColors(nums) {
  let p0 = 0, curr = 0, p2 = nums.length - 1;
  while (curr <= p2) {
    if (nums[curr] === 0) {
      [nums[p0], nums[curr]] = [nums[curr], nums[p0]];
      p0++; curr++;
    } else if (nums[curr] === 2) {
      [nums[p2], nums[curr]] = [nums[curr], nums[p2]];
      p2--;
    } else {
      curr++;
    }
  }
}`
  },
  {
    id: 77,
    title: "Combinations",
    difficulty: "Medium",
    tags: ["Backtracking"],
    acceptance: "69.1%",
    slug: "combinations",
    solution: `function combine(n, k) {
  const res = [];
  function backtrack(start, path) {
    if (path.length === k) { res.push([...path]); return; }
    for (let i = start; i <= n; i++) {
      path.push(i);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  backtrack(1, []);
  return res;
}`
  },
  {
    id: 78,
    title: "Subsets",
    difficulty: "Medium",
    tags: ["Array", "Backtracking", "Bit Manipulation"],
    acceptance: "76.9%",
    slug: "subsets",
    solution: `function subsets(nums) {
  const res = [];
  function backtrack(idx, path) {
    res.push([...path]);
    for (let i = idx; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  backtrack(0, []);
  return res;
}`
  },
  {
    id: 79,
    title: "Word Search",
    difficulty: "Medium",
    tags: ["Array", "String", "Backtracking", "Matrix"],
    acceptance: "41.9%",
    slug: "word-search",
    solution: `function exist(board, word) {
  const R = board.length, C = board[0].length;
  function dfs(r, c, idx) {
    if (idx === word.length) return true;
    if (r < 0 || r >= R || c < 0 || c >= C || board[r][c] !== word[idx]) return false;
    const temp = board[r][c];
    board[r][c] = "#"; // Mark visited
    const found = dfs(r+1, c, idx+1) || dfs(r-1, c, idx+1) || dfs(r, c+1, idx+1) || dfs(r, c-1, idx+1);
    board[r][c] = temp; // Restore
    return found;
  }
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      if (dfs(i, j, 0)) return true;
    }
  }
  return false;
}`
  },
  {
    id: 80,
    title: "Remove Duplicates from Sorted Array II",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers"],
    acceptance: "54.8%",
    slug: "remove-duplicates-from-sorted-array-ii",
    solution: `function removeDuplicates(nums) {
  let i = 0;
  for (let num of nums) {
    if (i < 2 || num > nums[i - 2]) {
      nums[i] = num;
      i++;
    }
  }
  return i;
}`
  },
  {
    id: 81,
    title: "Search in Rotated Sorted Array II",
    difficulty: "Medium",
    tags: ["Array", "Binary Search"],
    acceptance: "37.1%",
    slug: "search-in-rotated-sorted-array-ii",
    solution: `function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) return true;
    if (nums[l] === nums[mid] && nums[mid] === nums[r]) {
      l++; r--;
    } else if (nums[l] <= nums[mid]) {
      if (nums[l] <= target && target < nums[mid]) r = mid - 1;
      else l = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[r]) l = mid + 1;
      else r = mid - 1;
    }
  }
  return false;
}`
  },
  {
    id: 82,
    title: "Remove Duplicates from Sorted List II",
    difficulty: "Medium",
    tags: ["Linked List", "Two Pointers"],
    acceptance: "46.2%",
    slug: "remove-duplicates-from-sorted-list-ii",
    solution: `function deleteDuplicates(head) {
  let dummy = new ListNode(0, head);
  let pred = dummy;
  while (head) {
    if (head.next && head.val === head.next.val) {
      while (head.next && head.val === head.next.val) { head = head.next; }
      pred.next = head.next;
    } else {
      pred = pred.next;
    }
    head = head.next;
  }
  return dummy.next;
}`
  },
  {
    id: 86,
    title: "Partition List",
    difficulty: "Medium",
    tags: ["Linked List", "Two Pointers"],
    acceptance: "54.9%",
    slug: "partition-list",
    solution: `function partition(head, x) {
  let beforeHead = new ListNode(0), afterHead = new ListNode(0);
  let before = beforeHead, after = afterHead;
  while (head) {
    if (head.val < x) { before.next = head; before = before.next; }
    else { after.next = head; after = after.next; }
    head = head.next;
  }
  after.next = null;
  before.next = afterHead.next;
  return beforeHead.next;
}`
  },

  // ==================== HARD PROBLEMS (101 - 150) ====================
  {
    id: 4,
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    acceptance: "39.1%",
    slug: "median-of-two-sorted-arrays",
    solution: `function findMedianSortedArrays(nums1, nums2) {
  if (nums1.length > nums2.length) [nums1, nums2] = [nums2, nums1];
  const m = nums1.length, n = nums2.length;
  let l = 0, r = m;
  while (l <= r) {
    const i = Math.floor((l + r) / 2);
    const j = Math.floor((m + n + 1) / 2) - i;
    const maxLeft1 = i === 0 ? -Infinity : nums1[i - 1];
    const minRight1 = i === m ? Infinity : nums1[i];
    const maxLeft2 = j === 0 ? -Infinity : nums2[j - 1];
    const minRight2 = j === n ? Infinity : nums2[j];
    if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
      if ((m + n) % 2 !== 0) return Math.max(maxLeft1, maxLeft2);
      return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2;
    } else if (maxLeft1 > minRight2) r = i - 1;
    else l = i + 1;
  }
  return 0;
}`
  },
  {
    id: 10,
    title: "Regular Expression Matching",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming", "Recursion"],
    acceptance: "28.1%",
    slug: "regular-expression-matching",
    solution: `function isMatch(s, p) {
  const R = s.length, C = p.length;
  const dp = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(false));
  dp[0][0] = true;
  for (let j = 2; j <= C; j++) {
    if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
  }
  for (let i = 1; i <= R; i++) {
    for (let j = 1; j <= C; j++) {
      if (p[j - 1] === '.' || p[j - 1] === s[i - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else if (p[j - 1] === '*') {
        dp[i][j] = dp[i][j - 2];
        if (p[j - 2] === '.' || p[j - 2] === s[i - 1]) {
          dp[i][j] = dp[i][j] || dp[i - 1][j];
        }
      }
    }
  }
  return dp[R][C];
}`
  },
  {
    id: 23,
    title: "Merge k Sorted Lists",
    difficulty: "Hard",
    tags: ["Linked List", "Divide and Conquer", "Heap (Priority Queue)", "Merge Sort"],
    acceptance: "51.2%",
    slug: "merge-k-sorted-lists",
    solution: `function mergeKLists(lists) {
  if (lists.length === 0) return null;
  function mergeTwo(l1, l2) {
    if (!l1) return l2; if (!l2) return l1;
    if (l1.val < l2.val) { l1.next = mergeTwo(l1.next, l2); return l1; }
    else { l2.next = mergeTwo(l1, l2.next); return l2; }
  }
  while (lists.length > 1) {
    const a = lists.shift(), b = lists.shift();
    lists.push(mergeTwo(a, b));
  }
  return lists[0] || null;
}`
  },
  {
    id: 25,
    title: "Reverse Nodes in k-Group",
    difficulty: "Hard",
    tags: ["Linked List", "Recursion"],
    acceptance: "56.4%",
    slug: "reverse-nodes-in-k-group",
    solution: `function reverseKGroup(head, k) {
  let curr = head, count = 0;
  while (curr && count < k) { curr = curr.next; count++; }
  if (count === k) {
    curr = reverseKGroup(curr, k);
    while (count > 0) {
      let temp = head.next;
      head.next = curr;
      curr = head;
      head = temp;
      count--;
    }
    head = curr;
  }
  return head;
}`
  },
  {
    id: 30,
    title: "Substring with Concatenation of All Words",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Sliding Window"],
    acceptance: "31.9%",
    slug: "substring-with-concatenation-of-all-words",
    solution: `function findSubstring(s, words) {
  if (!s || !words.length) return [];
  const map = {}, wordLen = words[0].length, totalLen = wordLen * words.length, res = [];
  for (let w of words) map[w] = (map[w] || 0) + 1;
  for (let i = 0; i <= s.length - totalLen; i++) {
    const temp = { ...map };
    let j = 0;
    while (j < words.length) {
      const w = s.substring(i + j * wordLen, i + (j + 1) * wordLen);
      if (temp[w] > 0) { temp[w]--; j++; }
      else break;
    }
    if (j === words.length) res.push(i);
  }
  return res;
}`
  },
  {
    id: 32,
    title: "Longest Valid Parentheses",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming", "Stack"],
    acceptance: "33.5%",
    slug: "longest-valid-parentheses",
    solution: `function longestValidParentheses(s) {
  let max = 0, stack = [-1];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') { stack.push(i); }
    else {
      stack.pop();
      if (!stack.length) { stack.push(i); }
      else { max = Math.max(max, i - stack[stack.length - 1]); }
    }
  }
  return max;
}`
  },
  {
    id: 37,
    title: "Sudoku Solver",
    difficulty: "Hard",
    tags: ["Array", "Backtracking", "Matrix"],
    acceptance: "59.2%",
    slug: "sudoku-solver",
    solution: `function solveSudoku(board) {
  function isValid(r, c, val) {
    for (let i = 0; i < 9; i++) {
      if (board[r][i] === val || board[i][c] === val || board[3*Math.floor(r/3) + Math.floor(i/3)][3*Math.floor(c/3) + i%3] === val) return false;
    }
    return true;
  }
  function solve() {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] === '.') {
          for (let val = 1; val <= 9; val++) {
            const char = val.toString();
            if (isValid(i, j, char)) {
              board[i][j] = char;
              if (solve()) return true;
              board[i][j] = '.'; // Backtrack
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  solve();
}`
  },
  {
    id: 41,
    title: "First Missing Positive",
    difficulty: "Hard",
    tags: ["Array", "Hash Table"],
    acceptance: "38.2%",
    slug: "first-missing-positive",
    solution: `function firstMissingPositive(nums) {
  const n = nums.length;
  for (let i = 0; i < n; i++) {
    while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      [nums[nums[i] - 1], nums[i]] = [nums[i], nums[nums[i] - 1]]; // Swap
    }
  }
  for (let i = 0; i < n; i++) {
    if (nums[i] !== i + 1) return i + 1;
  }
  return n + 1;
}`
  },
  {
    id: 42,
    title: "Trapping Rain Water",
    difficulty: "Hard",
    tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack", "Monotonic Stack"],
    acceptance: "60.9%",
    slug: "trapping-rain-water",
    solution: `function trap(height) {
  let left = 0, right = height.length - 1, leftMax = 0, rightMax = 0, ans = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else ans += (leftMax - height[left]);
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else ans += (rightMax - height[right]);
      right--;
    }
  }
  return ans;
}`
  },
  {
    id: 44,
    title: "Wildcard Matching",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming", "Greedy", "Recursion"],
    acceptance: "27.5%",
    slug: "wildcard-matching",
    solution: `function isMatch(s, p) {
  let sIdx = 0, pIdx = 0, match = 0, starIdx = -1;
  while (sIdx < s.length) {
    if (pIdx < p.length && (p[pIdx] === '?' || p[pIdx] === s[sIdx])) {
      sIdx++; pIdx++;
    } else if (pIdx < p.length && p[pIdx] === '*') {
      starIdx = pIdx;
      match = sIdx;
      pIdx++;
    } else if (starIdx !== -1) {
      pIdx = starIdx + 1;
      match++;
      sIdx = match;
    } else return false;
  }
  while (pIdx < p.length && p[pIdx] === '*') pIdx++;
  return pIdx === p.length;
}`
  },
  {
    id: 51,
    title: "N-Queens",
    difficulty: "Hard",
    tags: ["Array", "Backtracking"],
    acceptance: "66.5%",
    slug: "n-queens",
    solution: `function solveNQueens(n) {
  const res = [], board = Array.from({ length: n }, () => new Array(n).fill('.'));
  function isValid(r, c) {
    for (let i = 0; i < r; i++) {
      if (board[i][c] === 'Q') return false;
      const diff = r - i;
      if (c - diff >= 0 && board[i][c - diff] === 'Q') return false;
      if (c + diff < n && board[i][c + diff] === 'Q') return false;
    }
    return true;
  }
  function backtrack(row) {
    if (row === n) { res.push(board.map(r => r.join(""))); return; }
    for (let col = 0; col < n; col++) {
      if (isValid(row, col)) {
        board[row][col] = 'Q';
        backtrack(row + 1);
        board[row][col] = '.'; // Backtrack
      }
    }
  }
  backtrack(0);
  return res;
}`
  },
  {
    id: 52,
    title: "N-Queens II",
    difficulty: "Hard",
    tags: ["Backtracking"],
    acceptance: "73.2%",
    slug: "n-queens-ii",
    solution: `function totalNQueens(n) {
  let count = 0;
  const cols = new Set(), diag1 = new Set(), diag2 = new Set();
  function backtrack(row) {
    if (row === n) { count++; return; }
    for (let col = 0; col < n; col++) {
      const d1 = row - col, d2 = row + col;
      if (cols.has(col) || diag1.has(d1) || diag2.has(d2)) continue;
      cols.add(col); diag1.add(d1); diag2.add(d2);
      backtrack(row + 1);
      cols.delete(col); diag1.delete(d1); diag2.delete(d2); // Backtrack
    }
  }
  backtrack(0);
  return count;
}`
  },
  {
    id: 65,
    title: "Valid Number",
    difficulty: "Hard",
    tags: ["String"],
    acceptance: "19.1%",
    slug: "valid-number",
    solution: `function isNumber(s) {
  return /^[+-]?((\\d+(\\.\\d*)?)|(\\.\\d+))([eE][+-]?\\d+)?$/.test(s.trim());
}`
  },
  {
    id: 68,
    title: "Text Justification",
    difficulty: "Hard",
    tags: ["Array", "String", "Simulation"],
    acceptance: "42.0%",
    slug: "text-justification",
    solution: `function fullJustify(words, maxWidth) {
  const res = [];
  let cur = [], curLen = 0;
  for (let w of words) {
    if (curLen + w.length + cur.length > maxWidth) {
      for (let i = 0; i < maxWidth - curLen; i++) {
        cur[i % (cur.length - 1 || 1)] += " ";
      }
      res.push(cur.join(""));
      cur = []; curLen = 0;
    }
    cur.push(w);
    curLen += w.length;
  }
  res.push(cur.join(" ") + " ".repeat(maxWidth - curLen - (cur.length - 1)));
  return res;
}`
  },
  {
    id: 72,
    title: "Edit Distance",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming"],
    acceptance: "54.8%",
    slug: "edit-distance",
    solution: `function minDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i-1] === word2[j-1]) dp[i][j] = dp[i-1][j-1];
      else dp[i][j] = Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
    }
  }
  return dp[m][n];
}`
  },
  {
    id: 76,
    title: "Minimum Window Substring",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Sliding Window"],
    acceptance: "42.5%",
    slug: "minimum-window-substring",
    solution: `function minWindow(s, t) {
  if (!s || !t) return "";
  const map = {};
  for (let char of t) map[char] = (map[char] || 0) + 1;
  let l = 0, r = 0, count = Object.keys(map).length, len = Infinity, head = 0;
  while (r < s.length) {
    const c = s[r];
    if (map[c] !== undefined) { map[c]--; if (map[c] === 0) count--; }
    r++;
    while (count === 0) {
      if (r - l < len) { len = r - l; head = l; }
      const temp = s[l];
      if (map[temp] !== undefined) { map[temp]++; if (map[temp] > 0) count++; }
      l++;
    }
  }
  return len === Infinity ? "" : s.substring(head, head + len);
}`
  },
  {
    id: 84,
    title: "Largest Rectangle in Histogram",
    difficulty: "Hard",
    tags: ["Array", "Stack", "Monotonic Stack"],
    acceptance: "43.9%",
    slug: "largest-rectangle-in-histogram",
    solution: `function maxRectangleArea(heights) {
  const stack = [-1];
  let maxArea = 0;
  for (let i = 0; i < heights.length; i++) {
    while (stack[stack.length - 1] !== -1 && heights[stack[stack.length - 1]] >= heights[i]) {
      const height = heights[stack.pop()];
      const width = i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, height * width);
    }
    stack.push(i);
  }
  while (stack[stack.length - 1] !== -1) {
    const height = heights[stack.pop()];
    const width = heights.length - stack[stack.length - 1] - 1;
    maxArea = Math.max(maxArea, height * width);
  }
  return maxArea;
}`
  },
  {
    id: 85,
    title: "Maximal Rectangle",
    difficulty: "Hard",
    tags: ["Array", "Dynamic Programming", "Stack", "Matrix", "Monotonic Stack"],
    acceptance: "46.2%",
    slug: "maximal-rectangle",
    solution: `function maximalRectangle(matrix) {
  if (!matrix.length) return 0;
  const R = matrix.length, C = matrix[0].length;
  const dp = new Array(C).fill(0);
  let maxArea = 0;
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      dp[j] = matrix[i][j] === '1' ? dp[j] + 1 : 0;
    }
    // Calculate max rectangle in histogram (dp array)
    const stack = [-1];
    for (let j = 0; j < C; j++) {
      while (stack[stack.length - 1] !== -1 && dp[stack[stack.length - 1]] >= dp[j]) {
        const height = dp[stack.pop()];
        const width = j - stack[stack.length - 1] - 1;
        maxArea = Math.max(maxArea, height * width);
      }
      stack.push(j);
    }
    while (stack[stack.length - 1] !== -1) {
      const height = dp[stack.pop()];
      const width = C - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, height * width);
    }
  }
  return maxArea;
}`
  },
  {
    id: 87,
    title: "Scramble String",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming"],
    acceptance: "39.1%",
    slug: "scramble-string",
    solution: `const memo = {};
function isScramble(s1, s2) {
  if (s1 === s2) return true;
  if (s1.length !== s2.length) return false;
  const key = s1 + "#" + s2;
  if (memo[key] !== undefined) return memo[key];
  
  const count = new Array(26).fill(0);
  for (let i = 0; i < s1.length; i++) {
    count[s1.charCodeAt(i) - 97]++;
    count[s2.charCodeAt(i) - 97]--;
  }
  for (let c of count) {
    if (c !== 0) return memo[key] = false;
  }
  
  const n = s1.length;
  for (let i = 1; i < n; i++) {
    if (isScramble(s1.substring(0, i), s2.substring(0, i)) && isScramble(s1.substring(i), s2.substring(i))) {
      return memo[key] = true;
    }
    if (isScramble(s1.substring(0, i), s2.substring(n - i)) && isScramble(s1.substring(i), s2.substring(0, n - i))) {
      return memo[key] = true;
    }
  }
  return memo[key] = false;
}`
  },
  {
    id: 97,
    title: "Interleaving String",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming"],
    acceptance: "38.9%",
    slug: "interleaving-string",
    solution: `function isInterleave(s1, s2, s3) {
  if (s1.length + s2.length !== s3.length) return false;
  const dp = new Array(s2.length + 1).fill(false);
  for (let i = 0; i <= s1.length; i++) {
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0 && j === 0) dp[j] = true;
      else if (i === 0) dp[j] = dp[j-1] && s2[j-1] === s3[j-1];
      else if (j === 0) dp[j] = dp[j] && s1[i-1] === s3[i-1];
      else dp[j] = (dp[j] && s1[i-1] === s3[i+j-1]) || (dp[j-1] && s2[j-1] === s3[i+j-1]);
    }
  }
  return dp[s2.length];
}`
  },
  {
    id: 99,
    title: "Recover Binary Search Tree",
    difficulty: "Hard",
    tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
    acceptance: "52.4%",
    slug: "recover-binary-search-tree",
    solution: `function recoverTree(root) {
  let first = null, second = null, prev = null;
  function traverse(node) {
    if (!node) return;
    traverse(node.left);
    if (prev && prev.val > node.val) {
      if (!first) first = prev;
      second = node;
    }
    prev = node;
    traverse(node.right);
  }
  traverse(root);
  const temp = first.val;
  first.val = second.val;
  second.val = temp;
}`
  },
  {
    id: 115,
    title: "Distinct Subsequences",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming"],
    acceptance: "44.9%",
    slug: "distinct-subsequences",
    solution: `function numDistinct(s, t) {
  const m = s.length, n = t.length;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  for (let i = 1; i <= m; i++) {
    for (let j = n; j >= 1; j--) {
      if (s[i-1] === t[j-1]) {
        dp[j] += dp[j-1];
      }
    }
  }
  return dp[n];
}`
  },
  {
    id: 123,
    title: "Best Time to Buy and Sell Stock III",
    difficulty: "Hard",
    tags: ["Array", "Dynamic Programming"],
    acceptance: "46.2%",
    slug: "best-time-to-buy-and-sell-stock-iii",
    solution: `function maxProfit(prices) {
  let t1Cost = Infinity, t2Cost = Infinity, t1Profit = 0, t2Profit = 0;
  for (let price of prices) {
    t1Cost = Math.min(t1Cost, price);
    t1Profit = Math.max(t1Profit, price - t1Cost);
    t2Cost = Math.min(t2Cost, price - t1Profit);
    t2Profit = Math.max(t2Profit, price - t2Cost);
  }
  return t2Profit;
}`
  },
  {
    id: 124,
    title: "Binary Tree Maximum Path Sum",
    difficulty: "Hard",
    tags: ["Dynamic Programming", "Tree", "Depth-First Search", "Binary Tree"],
    acceptance: "39.5%",
    slug: "binary-tree-maximum-path-sum",
    solution: `function maxPathSum(root) {
  let max = -Infinity;
  function maxGain(node) {
    if (!node) return 0;
    const leftGain = Math.max(maxGain(node.left), 0);
    const rightGain = Math.max(maxGain(node.right), 0);
    max = Math.max(max, node.val + leftGain + rightGain);
    return node.val + Math.max(leftGain, rightGain);
  }
  maxGain(root);
  return max;
}`
  },
  {
    id: 126,
    title: "Word Ladder II",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Backtracking", "Breadth-First Search"],
    acceptance: "27.1%",
    slug: "word-ladder-ii",
    solution: `// Solved using BFS to find shortest paths and DFS to backtrack combinations
function findLadders(beginWord, endWord, wordList) {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return [];
  wordSet.delete(beginWord);
  
  let queue = [beginWord];
  const steps = { [beginWord]: 0 };
  const fromMap = {};
  let found = false, step = 0;
  
  while (queue.length && !found) {
    step++;
    const nextQueue = [];
    const localVisited = new Set();
    for (let word of queue) {
      for (let i = 0; i < word.length; i++) {
        for (let c = 97; c <= 122; c++) {
          const newWord = word.substring(0, i) + String.fromCharCode(c) + word.substring(i + 1);
          if (newWord === endWord) {
            found = true;
          }
          if (wordSet.has(newWord)) {
            if (!steps[newWord] || steps[newWord] === step) {
              if (!fromMap[newWord]) fromMap[newWord] = new Set();
              fromMap[newWord].add(word);
              if (!localVisited.has(newWord)) {
                localVisited.add(newWord);
                nextQueue.push(newWord);
                steps[newWord] = step;
              }
            }
          }
        }
      }
    }
    for (let w of localVisited) wordSet.delete(w);
    queue = nextQueue;
  }
  
  if (!found) return [];
  const res = [];
  function dfs(curr, path) {
    if (curr === beginWord) { res.push([beginWord, ...path]); return; }
    for (let prev of fromMap[curr]) {
      dfs(prev, [curr, ...path]);
    }
  }
  dfs(endWord, []);
  return res;
}`
  },
  {
    id: 127,
    title: "Word Ladder",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Breadth-First Search"],
    acceptance: "38.5%",
    slug: "word-ladder",
    solution: `function ladderLength(beginWord, endWord, wordList) {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return 0;
  let queue = [[beginWord, 1]];
  while (queue.length) {
    const [word, step] = queue.shift();
    if (word === endWord) return step;
    for (let i = 0; i < word.length; i++) {
      for (let c = 97; c <= 122; c++) {
        const newWord = word.substring(0, i) + String.fromCharCode(c) + word.substring(i + 1);
        if (wordSet.has(newWord)) {
          wordSet.delete(newWord);
          queue.push([newWord, step + 1]);
        }
      }
    }
  }
  return 0;
}`
  },
  {
    id: 128,
    title: "Longest Consecutive Sequence",
    difficulty: "Hard",
    tags: ["Array", "Hash Table", "Union Find"],
    acceptance: "47.8%",
    slug: "longest-consecutive-sequence",
    solution: `function longestConsecutive(nums) {
  const set = new Set(nums);
  let max = 0;
  for (let num of set) {
    if (!set.has(num - 1)) {
      let currentNum = num;
      let currentStreak = 1;
      while (set.has(currentNum + 1)) {
        currentNum++;
        currentStreak++;
      }
      max = Math.max(max, currentStreak);
    }
  }
  return max;
}`
  },
  {
    id: 132,
    title: "Palindrome Partitioning II",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming"],
    acceptance: "33.9%",
    slug: "palindrome-partitioning-ii",
    solution: `function minCut(s) {
  const n = s.length, cuts = new Array(n).fill(0);
  const dp = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = 0; i < n; i++) {
    let min = i;
    for (let j = 0; j <= i; j++) {
      if (s[j] === s[i] && (i - j < 2 || dp[j + 1][i - 1])) {
        dp[j][i] = true;
        min = j === 0 ? 0 : Math.min(min, cuts[j - 1] + 1);
      }
    }
    cuts[i] = min;
  }
  return cuts[n - 1];
}`
  },
  {
    id: 135,
    title: "Candy",
    difficulty: "Hard",
    tags: ["Array", "Greedy"],
    acceptance: "42.9%",
    slug: "candy",
    solution: `function candy(ratings) {
  const n = ratings.length, candies = new Array(n).fill(1);
  for (let i = 1; i < n; i++) {
    if (ratings[i] > ratings[i-1]) candies[i] = candies[i-1] + 1;
  }
  for (let i = n - 2; i >= 0; i--) {
    if (ratings[i] > ratings[i+1]) candies[i] = Math.max(candies[i], candies[i+1] + 1);
  }
  return candies.reduce((sum, c) => sum + c, 0);
}`
  },
  {
    id: 140,
    title: "Word Break II",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Dynamic Programming", "Backtracking", "Trie", "Memoization"],
    acceptance: "48.2%",
    slug: "word-break-ii",
    solution: `const memo = {};
function wordBreak(s, wordDict) {
  if (memo[s] !== undefined) return memo[s];
  const dict = new Set(wordDict);
  const res = [];
  if (dict.has(s)) res.push(s);
  for (let i = 1; i < s.length; i++) {
    const word = s.substring(0, i);
    if (dict.has(word)) {
      const subRes = wordBreak(s.substring(i), wordDict);
      for (let sub of subRes) {
        res.push(word + " " + sub);
      }
    }
  }
  return memo[s] = res;
}`
  }
];
