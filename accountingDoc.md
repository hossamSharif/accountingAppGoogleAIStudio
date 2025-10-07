you are an expert software , expert i developing  multi langauge webapps mobile first design ,you  updated with vibe coding  .

your goal is write an prd for a simple accounting  app manage accounting for spare part shop during the financial year  for manage many shops of spare part ; there are 2 type of users . the admin (owners of those shops) , and users is the workers that work i those shops . 

the app will use to track the banks balance  and cash in hand balance for shops during the financial years and get the Profit margin  , so for each shop the admin will define  Opening Stock and Ending Stock . from those variables he can get the profit margins 
also the admin app will use it to monetring the users which is use must send daily report to the admin



 the main accounts type that  must (those accounts will be define in the database and it will just appear for the admin later in a drop down list  when admin wanna add accounts of the shops)
    sales account (payable)
    purchase account (recivable account)
    account recievable  (customers debitors)
    account payablable (suppleir cridetors)
    expenses 
    assests (cash or save)
    banks  
   * for oppeninig stock and endding stock recommend the proper names is accountting approach 
    

 when admin create a new shop must  creat sub accounts from the main account for the new shop including the and naming it clearly by add suffix of the shop name  
    
   sales-shop1 (the main account will be sales )
   purchase-shop1 (the main account will be purchase )
   expenses-shop1 (the main account will be expenses )
   customers-shop1 (account payable)
   suppleir-shop1 (account receivable) 
   cash account -shop1 
   bank account-shop1 
   
   * also he must define the account of  stock value and set the opning balance of it   and he can control the ending stock  values

   * for customers and suppleir  account the admin must add a first account (direct-sales-shop1 , direct-purchase-shop1)  which it will be the selected by default when user wanna add sales/purchase invoice for customers and supplier 

   * expenses sub accounts in shops must categories so that category will use later to filter and sort and also to preview analytic reports (salaries , breakfast , )

 the user (shop worker) can create i another level sub accounts  for the shope which it will a sub acounts from the main accounts that admin spicify the for the each shop  : for example 
    -ahmed-shop1 is sub account from the supplier-shop1   which is a sub account from the account payable
    -moh-shop1 is sub account from the customrers -shop1  which is a sub account from the account receivable  
    -dailybreakfast-shop1  its a sub account from the expenses-shop1  which is a sub account from the account expenses

the other accounts (sales-shop1 and purchase-shop1 and expenses-shopw and cash account-shop1 and bank-account shop1 and opening-stock-shop1 and endingstock-shop1) the user in shop can not create a sub account from it and it only control by tge admin 


 - calculate the profit each shope in spicific financial year  will calculate  based on balances of the accounts of the shop   (Ending Stock , Opening Stock , sales , purchase , expenses , ... any extra entry type depend on it nature (debit or credit )) by performing best accounting formula 
 - also the calculating of profit can be done for all shops in spicific year or in all years  in same way 