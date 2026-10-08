import React, { useState } from 'react';
import { 
  Database, 
  Terminal, 
  FileCode, 
  Layers, 
  ShieldCheck, 
  Briefcase, 
  Download, 
  Check, 
  Github,
  Server
} from 'lucide-react';
import JSZip from 'jszip';
import { PROJECT_FILES } from '../data/projectFiles';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      const zip = new JSZip();
      const folder = zip.folder("ecommerce-etl-pipeline");

      // Add project files
      for (const file of PROJECT_FILES) {
        folder?.file(file.path, file.content);
      }

      // Add raw sample CSV files
      folder?.file("data/raw/customers.csv", `customer_id,customer_unique_id,customer_city,customer_state,customer_zip_code_prefix,created_at\nCUST-1001,USER-A819,Austin,TX,78701,2024-01-10 08:14:22\nCUST-1002,USER-B223,Seattle,WA,98101,2024-01-11 11:30:45\nCUST-1003,USER-C450,Chicago,IL,60601,2024-01-12 14:15:10\nCUST-1004,USER-D912,San Francisco,CA,94102,2024-01-15 09:22:18\nCUST-1005,USER-E334,New York,NY,10001,2024-01-18 16:45:33\nCUST-1006,USER-F881,Boston,MA,02108,2024-01-20 10:05:50\nCUST-1007,USER-A819,Austin,TX,78701,2024-01-22 13:40:12\nCUST-1008,USER-G621,Denver,CO,80202,2024-01-25 15:18:29\nCUST-1009,USER-H743,Atlanta,GA,30303,2024-01-28 17:50:04\nCUST-1010,USER-K198,Miami,FL,33101,2024-02-01 12:11:36\nCUST-1011,USER-L552,Dallas,TX,75201,2024-02-03 14:20:00\nCUST-1012,USER-M904,Portland,OR,97201,2024-02-05 18:05:44\nCUST-1013,USER-N319,San Diego,CA,92101,2024-02-08 09:44:12\nCUST-1014,USER-P771,Phoenix,AZ,85001,2024-02-10 11:25:30\nCUST-1015,USER-Q482,Minneapolis,MN,55401,2024-02-12 16:35:19\n`);

      folder?.file("data/raw/products.csv", `product_id,product_category_name,product_name_length,product_description_length,product_weight_g,product_length_cm,product_height_cm,product_width_cm\nPROD-101,electronics,38,580,450.0,20,10,15\nPROD-102,audio_video,44,720,280.0,18,8,12\nPROD-103,computers_accessories,52,1100,1200.0,35,15,25\nPROD-104,home_appliances,31,450,3200.0,40,45,30\nPROD-105,sports_leisure,29,390,850.0,25,20,20\nPROD-106,health_beauty,35,620,190.0,12,18,6\nPROD-107,office_furniture,42,880,8400.0,65,75,60\nPROD-108,telephony,25,310,210.0,15,5,10\nPROD-109,books_technical,48,940,650.0,24,6,18\nPROD-110,automotive,37,510,1450.0,30,22,18\n`);

      folder?.file("data/raw/orders.csv", `order_id,customer_id,order_status,order_purchase_timestamp,order_approved_at,order_delivered_carrier_date,order_delivered_customer_date,order_estimated_delivery_date\nORD-7001,CUST-1001,delivered,2024-01-15 10:20:00,2024-01-15 10:35:12,2024-01-16 14:00:00,2024-01-19 15:30:00,2024-01-22 00:00:00\nORD-7002,CUST-1002,delivered,2024-01-16 11:15:30,2024-01-16 11:45:00,2024-01-17 09:12:00,2024-01-20 18:22:00,2024-01-24 00:00:00\nORD-7003,CUST-1003,delivered,2024-01-18 14:05:12,2024-01-18 14:20:05,2024-01-19 13:40:00,2024-01-23 11:10:00,2024-01-26 00:00:00\nORD-7004,CUST-1004,shipped,2024-01-20 09:40:55,2024-01-20 10:00:10,2024-01-21 16:15:00,,,2024-01-28 00:00:00\nORD-7005,CUST-1005,delivered,2024-01-22 16:30:22,2024-01-22 17:00:00,2024-01-23 11:20:00,2024-01-27 14:45:00,2024-01-30 00:00:00\nORD-7006,CUST-1006,delivered,2024-01-25 08:50:11,2024-01-25 09:15:00,2024-01-26 10:05:00,2024-01-30 16:10:00,2024-02-03 00:00:00\nORD-7007,CUST-1007,delivered,2024-01-28 13:12:44,2024-01-28 13:40:20,2024-01-29 15:30:00,2024-02-02 12:20:00,2024-02-05 00:00:00\nORD-7008,CUST-1008,canceled,2024-02-01 19:22:01,2024-02-01 19:40:00,,,,2024-02-08 00:00:00\nORD-7009,CUST-1009,delivered,2024-02-04 12:05:18,2024-02-04 12:30:00,2024-02-05 14:10:00,2024-02-09 17:00:00,2024-02-12 00:00:00\nORD-7010,CUST-1010,delivered,2024-02-07 15:45:30,2024-02-07 16:10:15,2024-02-08 10:20:00,2024-02-12 11:35:00,2024-02-15 00:00:00\nORD-7011,CUST-1011,delivered,2024-02-10 17:10:00,2024-02-10 17:35:00,2024-02-11 11:00:00,2024-02-15 14:15:00,2024-02-18 00:00:00\nORD-7012,CUST-1012,processing,2024-02-14 11:00:25,2024-02-14 11:20:00,,,,2024-02-21 00:00:00\nORD-7013,CUST-1013,delivered,2024-02-18 10:15:42,2024-02-18 10:45:00,2024-02-19 14:20:00,2024-02-23 15:50:00,2024-02-27 00:00:00\nORD-7014,CUST-1014,delivered,2024-02-22 14:35:10,2024-02-22 15:00:00,2024-02-23 09:40:00,2024-02-27 18:05:00,2024-03-02 00:00:00\nORD-7015,CUST-1015,delivered,2024-02-25 16:40:50,2024-02-25 17:05:10,2024-02-26 12:15:00,2024-03-01 13:25:00,2024-03-05 00:00:00\nORD-7005,CUST-1005,delivered,2024-01-22 16:30:22,2024-01-22 17:00:00,2024-01-23 11:20:00,2024-01-27 14:45:00,2024-01-30 00:00:00\nORD-BAD1,,delivered,2024-02-26 09:00:00,2024-02-26 09:15:00,2024-02-27 10:00:00,2024-03-02 12:00:00,2024-03-05 00:00:00\n`);

      folder?.file("data/raw/order_items.csv", `order_id,order_item_id,product_id,price,freight_value,shipping_limit_date\nORD-7001,1,PROD-101,149.99,14.50,2024-01-20 18:00:00\nORD-7002,1,PROD-102,79.50,11.20,2024-01-22 18:00:00\nORD-7003,1,PROD-103,320.00,22.00,2024-01-24 18:00:00\nORD-7003,2,PROD-108,45.00,8.50,2024-01-24 18:00:00\nORD-7004,1,PROD-104,185.00,25.00,2024-01-26 18:00:00\nORD-7005,1,PROD-105,89.90,12.00,2024-01-28 18:00:00\nORD-7006,1,PROD-106,35.00,9.00,2024-01-31 18:00:00\nORD-7007,1,PROD-101,149.99,14.50,2024-02-03 18:00:00\nORD-7007,2,PROD-109,55.00,10.00,2024-02-03 18:00:00\nORD-7008,1,PROD-107,450.00,38.00,2024-02-07 18:00:00\nORD-7009,1,PROD-110,115.00,16.50,2024-02-10 18:00:00\nORD-7010,1,PROD-102,79.50,11.20,2024-02-13 18:00:00\nORD-7011,1,PROD-103,320.00,22.00,2024-02-16 18:00:00\nORD-7012,1,PROD-106,35.00,9.00,2024-02-20 18:00:00\nORD-7013,1,PROD-105,89.90,12.00,2024-02-24 18:00:00\nORD-7014,1,PROD-108,45.00,8.50,2024-02-28 18:00:00\nORD-7015,1,PROD-104,185.00,25.00,2024-03-02 18:00:00\nORD-7015,2,PROD-101,149.99,14.50,2024-03-02 18:00:00\nORD-BAD2,1,PROD-101,-25.00,10.00,2024-02-25 18:00:00\n`);

      folder?.file("data/raw/payments.csv", `order_id,payment_sequential,payment_type,payment_installments,payment_value\nORD-7001,1,credit_card,3,164.49\nORD-7002,1,boleto,1,90.70\nORD-7003,1,credit_card,6,395.50\nORD-7004,1,credit_card,4,210.00\nORD-7005,1,debit_card,1,101.90\nORD-7006,1,voucher,1,44.00\nORD-7007,1,credit_card,2,229.49\nORD-7008,1,credit_card,10,488.00\nORD-7009,1,boleto,1,131.50\nORD-7010,1,credit_card,3,90.70\nORD-7011,1,credit_card,5,342.00\nORD-7012,1,credit_card,1,44.00\nORD-7013,1,debit_card,1,101.90\nORD-7014,1,voucher,1,53.50\nORD-7015,1,credit_card,4,374.49\n`);

      folder?.file("data/raw/orders_incremental.csv", `order_id,customer_id,order_status,order_purchase_timestamp,order_approved_at,order_delivered_carrier_date,order_delivered_customer_date,order_estimated_delivery_date\nORD-7016,CUST-1001,delivered,2024-03-02 09:14:00,2024-03-02 09:30:00,2024-03-03 14:00:00,2024-03-06 16:30:00,2024-03-10 00:00:00\nORD-7017,CUST-1004,shipped,2024-03-05 14:22:15,2024-03-05 14:45:00,2024-03-06 10:15:00,,,2024-03-12 00:00:00\nORD-7018,CUST-1006,processing,2024-03-08 11:05:40,2024-03-08 11:20:00,,,,2024-03-15 00:00:00\nORD-7019,CUST-1008,delivered,2024-03-10 16:40:10,2024-03-10 17:00:00,2024-03-11 11:30:00,2024-03-15 14:10:00,2024-03-18 00:00:00\nORD-7020,CUST-1011,delivered,2024-03-12 18:00:20,2024-03-12 18:25:00,2024-03-13 13:45:00,2024-03-17 11:20:00,2024-03-20 00:00:00\n`);

      folder?.file("data/raw/order_items_incremental.csv", `order_id,order_item_id,product_id,price,freight_value,shipping_limit_date\nORD-7016,1,PROD-103,320.00,22.00,2024-03-08 18:00:00\nORD-7017,1,PROD-105,89.90,12.00,2024-03-11 18:00:00\nORD-7018,1,PROD-102,79.50,11.20,2024-03-14 18:00:00\nORD-7019,1,PROD-109,55.00,10.00,2024-03-16 18:00:00\nORD-7020,1,PROD-101,149.99,14.50,2024-03-18 18:00:00\n`);

      folder?.file("data/raw/payments_incremental.csv", `order_id,payment_sequential,payment_type,payment_installments,payment_value\nORD-7016,1,credit_card,4,342.00\nORD-7017,1,credit_card,2,101.90\nORD-7018,1,boleto,1,90.70\nORD-7019,1,voucher,1,65.00\nORD-7020,1,credit_card,3,164.49\n`);

      folder?.file("data/quarantine/.gitkeep", "# Bad records directory");
      folder?.file("data/processed/.gitkeep", "# Processed datasets directory");
      folder?.file("logs/.gitkeep", "# Pipeline execution logs");

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ecommerce-etl-pipeline.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error("ZIP Generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const navItems = [
    { id: 'architecture', label: 'Architecture & DAG', icon: Layers },
    { id: 'pipeline', label: 'Live Pipeline Runner', icon: Terminal },
    { id: 'code', label: 'Code & Repo Explorer', icon: FileCode },
    { id: 'sql', label: 'MySQL & SQL Queries', icon: Database },
    { id: 'quality', label: 'Data Quality & Quarantine', icon: ShieldCheck },
    { id: 'resume', label: 'Resume & Interview Prep', icon: Briefcase },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100 sticky top-0 z-50 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                End-to-End E-Commerce ETL Pipeline
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Portfolio Grade
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Python · pandas · SQL · MySQL 8.0 · Docker · Incremental Loading · 3NF Schema
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
              downloaded
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold'
            } active:scale-95 disabled:opacity-60`}
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded ZIP!</span>
              </>
            ) : downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Bundling Repo...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Repo (.ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none border-t border-slate-900 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
