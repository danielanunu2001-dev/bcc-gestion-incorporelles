import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';  // ✅ Import correct pour la version 5.x

const ExportButtons = ({ data, filename = 'actifs', type = 'actifs' }) => {
  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch {
      return `${(value || 0).toLocaleString()} FC`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'logiciel': 'Logiciel',
      'brevet': 'Brevet',
      'licence': 'Licence',
      'fonds_commercial': 'Fonds commercial',
      'materiel': 'Matériel',
      'vehicule': 'Véhicule',
      'bâtiment': 'Bâtiment',
      'terrain': 'Terrain',
      'autres': 'Autres'
    };
    return types[type] || type;
  };

  const getEtatLabel = (etat) => {
    const etats = {
      'neuf': 'Neuf',
      'bon': 'Bon état',
      'reparation': 'En réparation',
      'hors_service': 'Hors service'
    };
    return etats[etat] || etat || 'N/A';
  };

  // Préparer les données pour l'export Excel (détaillé)
  const prepareDataForExcel = () => {
    if (type === 'actifs') {
      return data.map(actif => ({
        'Code': actif.code,
        'Nom': actif.nom,
        'Type': getTypeLabel(actif.type),
        'Type d\'immobilisation': actif.type_immobilisation === 'corporel' ? 'Corporel' : 'Incorporel',
        'Numéro inventaire': actif.numero_inventaire || '-',
        'Date acquisition': formatDate(actif.date_acquisition),
        'Coût acquisition (FC)': actif.cout_acquisition,
        'Valeur résiduelle (FC)': actif.valeur_residuelle || 0,
        'Durée (ans)': actif.duree_utile_ans,
        'Mode amortissement': actif.mode_amortissement === 'lineaire' ? 'Linéaire' : 'Dégressif',
        'Taux amortissement (%)': actif.taux_amortissement ? `${actif.taux_amortissement}%` : '',
        'Valeur nette (FC)': actif.valeur_nette,
        'Statut': actif.actif ? 'Actif' : 'Inactif',
        'Localisation': actif.localisation || '-',
        'Affectation': actif.affectation || '-',
        'Fournisseur': actif.fournisseur || '-',
        'Numéro facture': actif.numero_facture || '-',
        'État': getEtatLabel(actif.etat),
        'Créé le': formatDate(actif.created_at)
      }));
    } else if (type === 'amortissements') {
      return data.map(am => ({
        'Exercice': am.exercice,
        'Annuité (FC)': am.annuite,
        'Cumul (FC)': am.cumul_amortissements,
        'Valeur nette (FC)': am.valeur_nette,
        'Taux (%)': am.taux || '-'
      }));
    }
    return [];
  };

  // ✅ Export Excel
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(prepareDataForExcel());
      const workbook = XLSX.utils.book_new();
      
      // Ajuster la largeur des colonnes
      const maxWidth = Object.keys(worksheet).reduce((acc, cell) => {
        if (cell[0] !== '!') {
          const col = cell.match(/[A-Z]+/)[0];
          acc[col] = Math.max(acc[col] || 0, worksheet[cell]?.v?.toString().length || 0);
        }
        return acc;
      }, {});
      
      worksheet['!cols'] = Object.values(maxWidth).map(w => ({ wch: Math.min(w + 2, 30) }));
      
      XLSX.utils.book_append_sheet(workbook, worksheet, type === 'actifs' ? 'Actifs' : 'Amortissements');
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      alert('Erreur lors de l\'export Excel: ' + error.message);
    }
  };

  // ✅ Export PDF - Version avec autoTable importé
  const exportToPDF = () => {
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // En-tête avec fond coloré
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
      
      // Titre
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`Liste des ${type === 'actifs' ? 'actifs' : 'amortissements'}`, 14, 20);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Informations de génération
      const today = new Date();
      doc.text(`Généré le : ${today.toLocaleDateString('fr-FR')} à ${today.toLocaleTimeString('fr-FR')}`, 14, 38);
      
      // Résumé statistique
      if (type === 'actifs') {
        const totalBrut = data.reduce((sum, a) => sum + (a.cout_acquisition || 0), 0);
        const totalNet = data.reduce((sum, a) => sum + (a.valeur_nette || 0), 0);
        const actifsActifs = data.filter(a => a.actif).length;
        const actifsInactifs = data.length - actifsActifs;
        
        doc.text(`Total actifs : ${data.length}`, 14, 45);
        doc.text(`Actifs : ${actifsActifs} (${Math.round(actifsActifs / data.length * 100)}%)`, 80, 45);
        doc.text(`Inactifs : ${actifsInactifs} (${Math.round(actifsInactifs / data.length * 100)}%)`, 140, 45);
        doc.text(`Valeur brute totale : ${(totalBrut / 1000000).toFixed(2)} M FC`, 14, 52);
        doc.text(`Valeur nette totale : ${(totalNet / 1000000).toFixed(2)} M FC`, 80, 52);
      } else {
        const totalDotations = data.reduce((sum, a) => sum + (a.annuite || 0), 0);
        doc.text(`Nombre d'enregistrements : ${data.length}`, 14, 45);
        doc.text(`Total des dotations : ${(totalDotations / 1000000).toFixed(2)} M FC`, 80, 45);
      }
      
      // Ligne de séparation
      doc.setDrawColor(200, 200, 200);
      doc.line(10, 58, doc.internal.pageSize.width - 10, 58);
      
      // Préparer les données pour le tableau
      let headers = [];
      let rows = [];
      
      if (type === 'actifs') {
        headers = ['Code', 'Nom', 'Type', 'Date Acq.', 'Coût (M)', 'VNC (M)', 'Statut', 'Localisation', 'Affectation'];
        rows = data.map(actif => [
          actif.code,
          actif.nom,
          getTypeLabel(actif.type),
          formatDate(actif.date_acquisition),
          ((actif.cout_acquisition || 0) / 1000000).toFixed(2),
          ((actif.valeur_nette || 0) / 1000000).toFixed(2),
          actif.actif ? 'Actif' : 'Inactif',
          actif.localisation || '-',
          actif.affectation || '-'
        ]);
      } else {
        headers = ['Exercice', 'Annuité (M FC)', 'Cumul (M FC)', 'VNC (M FC)'];
        rows = data.map(am => [
          am.exercice,
          ((am.annuite || 0) / 1000000).toFixed(2),
          ((am.cumul_amortissements || 0) / 1000000).toFixed(2),
          ((am.valeur_nette || 0) / 1000000).toFixed(2)
        ]);
      }
      
      // ✅ Utilisation de autoTable comme fonction importée
      autoTable(doc, {
        startY: 65,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { left: 10, right: 10 },
        didDrawPage: function(data) {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Page ${data.pageNumber} / ${pageCount}`,
            doc.internal.pageSize.width - 20,
            doc.internal.pageSize.height - 10
          );
          doc.text(
            'BCC - Gestion des immobilisations',
            10,
            doc.internal.pageSize.height - 10
          );
        }
      });

      doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF: ' + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={exportToExcel}
        style={{ ...styles.button, backgroundColor: '#10b981' }}
        title="Exporter en Excel"
      >
        📊 Excel
      </button>
      <button
        onClick={exportToPDF}
        style={{ ...styles.button, backgroundColor: '#ef4444' }}
        title="Exporter en PDF"
      >
        📄 PDF
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    gap: '0.5rem'
  },
  button: {
    padding: '0.5rem 1rem',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  }
};

export default ExportButtons;