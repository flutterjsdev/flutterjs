// Flutter services/autofill.dart → JS

export class AutofillHints {
  static get birthday()              { return 'birthday'; }
  static get birthdayDay()           { return 'birthdayDay'; }
  static get birthdayMonth()         { return 'birthdayMonth'; }
  static get birthdayYear()          { return 'birthdayYear'; }
  static get countryCode()           { return 'countryCode'; }
  static get countryName()           { return 'countryName'; }
  static get creditCardExpirationDate() { return 'creditCardExpirationDate'; }
  static get creditCardExpirationDay()  { return 'creditCardExpirationDay'; }
  static get creditCardExpirationMonth(){ return 'creditCardExpirationMonth'; }
  static get creditCardExpirationYear() { return 'creditCardExpirationYear'; }
  static get creditCardFamilyName()  { return 'creditCardFamilyName'; }
  static get creditCardGivenName()   { return 'creditCardGivenName'; }
  static get creditCardMiddleName()  { return 'creditCardMiddleName'; }
  static get creditCardName()        { return 'creditCardName'; }
  static get creditCardNumber()      { return 'creditCardNumber'; }
  static get creditCardSecurityCode(){ return 'creditCardSecurityCode'; }
  static get creditCardType()        { return 'creditCardType'; }
  static get email()                 { return 'email'; }
  static get familyName()            { return 'familyName'; }
  static get fullStreetAddress()     { return 'fullStreetAddress'; }
  static get gender()                { return 'gender'; }
  static get givenName()             { return 'givenName'; }
  static get impp()                  { return 'impp'; }
  static get jobTitle()              { return 'jobTitle'; }
  static get language()              { return 'language'; }
  static get location()              { return 'location'; }
  static get middleInitial()         { return 'middleInitial'; }
  static get middleName()            { return 'middleName'; }
  static get name()                  { return 'name'; }
  static get namePrefix()            { return 'namePrefix'; }
  static get nameSuffix()            { return 'nameSuffix'; }
  static get newPassword()           { return 'newPassword'; }
  static get newUsername()           { return 'newUsername'; }
  static get nickname()              { return 'nickname'; }
  static get oneTimeCode()           { return 'oneTimeCode'; }
  static get organizationName()      { return 'organizationName'; }
  static get password()              { return 'password'; }
  static get photo()                 { return 'photo'; }
  static get postalAddress()         { return 'postalAddress'; }
  static get postalAddressExtended() { return 'postalAddressExtended'; }
  static get postalAddressExtendedPostalCode() { return 'postalAddressExtendedPostalCode'; }
  static get postalCode()            { return 'postalCode'; }
  static get streetAddressLevel1()   { return 'streetAddressLevel1'; }
  static get streetAddressLevel2()   { return 'streetAddressLevel2'; }
  static get streetAddressLevel3()   { return 'streetAddressLevel3'; }
  static get streetAddressLevel4()   { return 'streetAddressLevel4'; }
  static get streetAddressLine1()    { return 'streetAddressLine1'; }
  static get streetAddressLine2()    { return 'streetAddressLine2'; }
  static get streetAddressLine3()    { return 'streetAddressLine3'; }
  static get sublocality()           { return 'sublocality'; }
  static get telephoneNumber()       { return 'telephoneNumber'; }
  static get telephoneNumberAreaCode(){ return 'telephoneNumberAreaCode'; }
  static get telephoneNumberCountryCode(){ return 'telephoneNumberCountryCode'; }
  static get telephoneNumberDevice() { return 'telephoneNumberDevice'; }
  static get telephoneNumberExtension(){ return 'telephoneNumberExtension'; }
  static get telephoneNumberLocal()  { return 'telephoneNumberLocal'; }
  static get telephoneNumberLocalPrefix(){ return 'telephoneNumberLocalPrefix'; }
  static get telephoneNumberLocalSuffix(){ return 'telephoneNumberLocalSuffix'; }
  static get telephoneNumberNational(){ return 'telephoneNumberNational'; }
  static get transactionAmount()     { return 'transactionAmount'; }
  static get transactionCurrency()   { return 'transactionCurrency'; }
  static get url()                   { return 'url'; }
  static get username()              { return 'username'; }
}

export class AutofillConfiguration {
  constructor({ uniqueIdentifier, autofillHints, currentEditingValue, hintText = null }) {
    this.uniqueIdentifier = uniqueIdentifier;
    this.autofillHints = autofillHints;
    this.currentEditingValue = currentEditingValue;
    this.hintText = hintText;
  }
}

export class AutofillClient {
  get autofillId() { throw new Error('autofillId not implemented'); }
  get currentAutofillScope() { throw new Error('currentAutofillScope not implemented'); }
  get textInputConfiguration() { throw new Error('textInputConfiguration not implemented'); }
  autofill(textEditingValue) { throw new Error('autofill not implemented'); }
}

export class AutofillScope {
  get autofillClients() { throw new Error('autofillClients not implemented'); }
  getAutofillClient(autofillId) { throw new Error('getAutofillClient not implemented'); }
  attach(trigger, configuration) { throw new Error('attach not implemented'); }
}

export class AutofillScopeMixin extends AutofillScope {
  getAutofillClient(autofillId) {
    for (const client of this.autofillClients) {
      if (client.autofillId === autofillId) return client;
    }
    return null;
  }
}
