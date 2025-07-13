export interface CompanyProfile {
  company_name: string;
  company_number: string;
  company_status: string;
  company_type: string;
  date_of_creation: string;
  registered_office_address: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
  sic_codes?: string[];
  accounts?: {
    next_due?: string;
    next_made_up_to?: string;
  };
}

export interface CompanySearch {
  total_results: number;
  items: CompanySearchItem[];
}

export interface CompanySearchItem {
  company_name: string;
  company_number: string;
  company_status: string;
  company_type: string;
  date_of_creation: string;
  address: {
    address_line_1?: string;
    locality?: string;
    postal_code?: string;
  };
}

export interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
  address: {
    address_line_1?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface CompanyFiling {
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  type: string;
}