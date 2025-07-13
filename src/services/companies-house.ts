import axios, { type AxiosInstance } from 'axios';
import { CompanyProfile, CompanySearch, CompanyOfficer, CompanyFiling } from '../types';

export class CompaniesHouseService {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey: string;

  constructor(apiKey: string, baseURL: string = 'https://api.company-information.service.gov.uk') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: this.apiKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async searchCompanies(query: string, itemsPerPage: number = 20): Promise<CompanySearch> {
    try {
      const response = await this.client.get('/search/companies', {
        params: {
          q: query,
          items_per_page: itemsPerPage,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search companies: ${error}`);
    }
  }

  async getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
    try {
      const response = await this.client.get(`/company/${companyNumber}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get company profile: ${error}`);
    }
  }

  async getCompanyOfficers(companyNumber: string): Promise<CompanyOfficer[]> {
    try {
      const response = await this.client.get(`/company/${companyNumber}/officers`);
      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to get company officers: ${error}`);
    }
  }

  async getCompanyFilings(companyNumber: string, itemsPerPage: number = 25): Promise<CompanyFiling[]> {
    try {
      const response = await this.client.get(`/company/${companyNumber}/filing-history`, {
        params: {
          items_per_page: itemsPerPage,
        },
      });
      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to get company filings: ${error}`);
    }
  }
}